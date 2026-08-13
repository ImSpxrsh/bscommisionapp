/**
 * Phase 1 gate: the model must round-trip a realistic pathway that contains
 * setbacks, and the privacy boundary must hold.
 */

import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import {
  Pathway,
  buildIndex,
  canRankInDefaultSort,
  canSubmitPathway,
  completenessScore,
  deriveTier,
  formatDuration,
  hasDocumentedObstacle,
  isIncompleteOnFriction,
  isPubliclyVisibleUnderConsent,
  overlappingSteps,
  pathwayDuration,
  privateValuesOf,
  resolveNode,
  sortSteps,
  toPublicPathway,
  transitionSlug,
  verifiedClaims,
  SEED_TAXONOMY,
} from '../dist/index.js';
import { EE_TO_DENTAL } from '../dist/fixtures.js';

test('a realistic pathway with setbacks round-trips through the schema', () => {
  const parsed = Pathway.parse(EE_TO_DENTAL);
  const reparsed = Pathway.parse(JSON.parse(JSON.stringify(parsed)));
  assert.deepEqual(reparsed, parsed, 'pathway must survive a serialize/parse cycle unchanged');

  assert.ok(parsed.steps.some((s) => s.type === 'setback'), 'fixture must contain a setback step');
  assert.ok(hasDocumentedObstacle(parsed.steps), 'fixture must document obstacles');
  assert.equal(isIncompleteOnFriction(parsed), false);
});

test('schema rejects a step that ends before it starts', () => {
  const bad = structuredClone(EE_TO_DENTAL);
  bad.steps[0].endDate = '2016-01';
  const result = Pathway.safeParse(bad);
  assert.equal(result.success, false);
});

test('schema rejects an ongoing step that also has an end date', () => {
  const bad = structuredClone(EE_TO_DENTAL);
  bad.steps[0].ongoing = true;
  assert.equal(Pathway.safeParse(bad).success, false);
});

test('schema rejects duplicate step ids', () => {
  const bad = structuredClone(EE_TO_DENTAL);
  bad.steps[1].id = bad.steps[0].id;
  assert.equal(Pathway.safeParse(bad).success, false);
});

test('schema rejects an outcome that predates the first step', () => {
  const bad = structuredClone(EE_TO_DENTAL);
  bad.outcome.date = '2015-01';
  assert.equal(Pathway.safeParse(bad).success, false);
});

test('duration is computed across the whole pathway', () => {
  const p = Pathway.parse(EE_TO_DENTAL);
  const months = pathwayDuration(p);
  // 2017-09 through 2022-03
  assert.equal(months, 54);
  assert.equal(formatDuration(months), '4 yr 6 mo');
});

test('steps sort chronologically and overlaps are reported, not rejected', () => {
  const p = Pathway.parse(EE_TO_DENTAL);
  const sorted = sortSteps(p.steps);
  for (let i = 1; i < sorted.length; i += 1) {
    assert.ok(sorted[i - 1].startDate <= sorted[i].startDate);
  }
  // The fixture deliberately overlaps a full-time job with evening coursework.
  const overlaps = overlappingSteps(p.steps, p.outcome.date);
  assert.ok(overlaps.length > 0, 'concurrent work and study must be representable');
});

test('an anonymous pathway never leaks the real name or private fields', () => {
  const p = Pathway.parse(EE_TO_DENTAL);
  const pub = toPublicPathway(p);
  const serialized = JSON.stringify(pub);

  for (const secret of privateValuesOf(p)) {
    assert.ok(
      !serialized.includes(secret),
      `public output leaked a private value: ${secret}`,
    );
  }

  assert.equal(pub.person.displayName, p.person.pseudonym);
  assert.equal(pub.person.isAnonymous, true);
  assert.equal('realName' in pub.person, false, 'realName key must be absent, not null');
  assert.equal(pub.outcome.compensationBand, undefined, 'compensation is private here');
  assert.equal('relayAddress' in pub.contact, false, 'relay address must never serialize');
});

test('redaction deletes keys rather than nulling them', () => {
  const p = Pathway.parse(EE_TO_DENTAL);
  const pub = toPublicPathway(p);
  // A present-but-null key still tells an observer the field exists.
  assert.equal(Object.hasOwn(pub.outcome, 'compensationBand'), false);
});

test('a public pathway keeps the fields it is allowed to show', () => {
  const p = Pathway.parse(EE_TO_DENTAL);
  const pub = toPublicPathway(p);
  assert.equal(pub.startingPoint.gpaBand, '3.0-3.4');
  assert.deepEqual(pub.person.backgroundTags, ['first-generation', 'international-student']);
  assert.equal(pub.person.locations[0], 'Chicago, United States', 'metro precision drops the city');
  assert.equal(pub.contact.isOpen, true);
  assert.equal(pub.steps.length, p.steps.length);
});

test('verification tier is derived from live signals, never set directly', () => {
  const p = Pathway.parse(EE_TO_DENTAL);
  const tier = deriveTier(p.verification.signals, { hasAttestation: true });
  assert.equal(tier, 'institution-verified');
  assert.equal(p.verification.tier, tier, 'stored tier must match derived tier');

  const claims = verifiedClaims(p.verification.signals);
  assert.ok(claims.has('st_008'), 'the post-bacc step is the institution-verified claim');
  assert.ok(claims.has('identity'));
  assert.equal(claims.has('st_005'), false, 'the failed cycle carries no signal');
});

test('an expired signal demotes the tier automatically', () => {
  const signals = [
    {
      kind: 'linkedin_oauth',
      status: 'passed',
      checkedAt: '2020-01-01T00:00:00.000Z',
      claimRef: 'identity',
      expiresAt: '2021-01-01T00:00:00.000Z',
    },
  ];
  const now = new Date('2026-01-01T00:00:00.000Z');
  assert.equal(deriveTier(signals, { hasAttestation: true }, now), 'self-attested');
  assert.equal(
    deriveTier(signals, { hasAttestation: true }, new Date('2020-06-01T00:00:00.000Z')),
    'source-linked',
  );
});

test('unverified content is ranked out of the default sort but not hidden', () => {
  assert.equal(canRankInDefaultSort('unverified'), false);
  assert.equal(canRankInDefaultSort('self-attested'), true);
  assert.equal(canRankInDefaultSort('institution-verified'), true);
});

test('EE spelling variants collapse to one taxonomy node', () => {
  const index = buildIndex(SEED_TAXONOMY);
  const variants = [
    'EE',
    'Electrical Engineering',
    'electrical engineering',
    'Electrical & Computer Engineering',
    'Electrical and Computer Engineering',
    'ECE',
  ];
  const ids = variants.map((v) => resolveNode(v, 'major', index, SEED_TAXONOMY).node.id);
  assert.deepEqual(
    [...new Set(ids)],
    ['electrical-engineering'],
    `variants resolved to ${JSON.stringify(ids)}`,
  );
});

test('a typo still resolves, and is flagged for review', () => {
  const index = buildIndex(SEED_TAXONOMY);
  const r = resolveNode('Electrical Enginering', 'major', index, SEED_TAXONOMY);
  assert.equal(r.node.id, 'electrical-engineering');
  assert.ok(r.needsReview, 'a fuzzy match must be queued for human review');
});

test('unknown input yields a provisional node instead of blocking submission', () => {
  const index = buildIndex(SEED_TAXONOMY);
  const r = resolveNode('Underwater Basket Weaving', 'major', index, SEED_TAXONOMY);
  assert.equal(r.method, 'provisional');
  assert.equal(r.node.canonical, false);
  assert.ok(r.needsReview);
  assert.equal(r.node.label, 'Underwater Basket Weaving', 'the submitter’s wording is preserved');
});

test('merged nodes redirect to their target', () => {
  const nodes = [
    ...SEED_TAXONOMY,
    {
      id: 'ee-old',
      kind: 'major',
      type: 'education',
      label: 'Electrical Engineering Technology',
      synonyms: [],
      source: 'user-submitted',
      canonical: false,
      mergedInto: 'electrical-engineering',
    },
  ];
  const index = buildIndex(nodes);
  const r = resolveNode('Electrical Engineering Technology', 'major', index, nodes);
  assert.equal(r.node.id, 'electrical-engineering');
});

test('transition slug is stable and shareable', () => {
  assert.equal(
    transitionSlug('Electrical Engineering', 'Dental School'),
    'electrical-engineering-to-dental-school',
  );
});

test('completeness score is explained, not just a number', () => {
  const p = Pathway.parse(EE_TO_DENTAL);
  const { score, components } = completenessScore(p);
  assert.ok(score > 70, `a thorough pathway should score well, got ${score}`);
  assert.ok(score <= 100);
  assert.ok(components.every((c) => c.hint.length > 0), 'every component explains itself');
  assert.equal(
    components.reduce((s, c) => s + c.possible, 0),
    100,
  );
});

test('a frictionless pathway is marked incomplete unless explicitly attested', () => {
  const clean = structuredClone(EE_TO_DENTAL);
  clean.steps = clean.steps
    .filter((s) => s.type !== 'setback')
    .map((s) => {
      delete s.obstacle;
      return s;
    });
  clean.attestedNoObstacles = false;
  const parsed = Pathway.parse(clean);
  assert.equal(isIncompleteOnFriction(parsed), true);

  clean.attestedNoObstacles = true;
  assert.equal(isIncompleteOnFriction(Pathway.parse(clean)), false);
});

test('submission is gated by age, and 16–17 requires parental consent', () => {
  assert.deepEqual(canSubmitPathway({ age: 22 }), {
    allowed: true,
    requiresParentalConsent: false,
  });

  const minor = canSubmitPathway({ age: 16 });
  assert.equal(minor.allowed, false);
  assert.equal(minor.requiresParentalConsent, true);

  const consented = canSubmitPathway({
    age: 17,
    parentalConsent: { status: 'granted', grantedAt: '2026-01-01T00:00:00.000Z', revokedAt: null },
  });
  assert.equal(consented.allowed, true);

  const tooYoung = canSubmitPathway({ age: 14 });
  assert.equal(tooYoung.allowed, false);
  assert.equal(tooYoung.requiresParentalConsent, false);
});

test('withdrawing parental consent unpublishes a minor’s pathway', () => {
  const revoked = { status: 'revoked', grantedAt: null, revokedAt: '2026-02-01T00:00:00.000Z' };
  assert.equal(isPubliclyVisibleUnderConsent({ authorAge: 17, parentalConsent: revoked }), false);
  assert.equal(isPubliclyVisibleUnderConsent({ authorAge: 19, parentalConsent: revoked }), true);
});
