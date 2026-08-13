/**
 * Phase 2 gate: faceted search returns correct counts.
 *
 * Facet counts are verified against an INDEPENDENT count over the corpus rather
 * than against the engine's own output, so a bug in the counting path cannot
 * validate itself.
 */

import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import {
  EMPTY_FILTERS,
  activeFilterCount,
  adjacentTransitions,
  computeFacets,
  filtersFromSearchParams,
  filtersToQueryString,
  filtersToSearchParams,
  parseQuery,
  relevanceScore,
  search,
} from '../dist/index.js';
import { SEED_TAXONOMY } from '@precedent/core';
import { MemoryStore } from '@precedent/api/dist/store.js';

const store = new MemoryStore();
const docs = store.listDocs();

// ------------------------------------------------------------------ URL codec

test('filter state survives a round trip through the URL', () => {
  const filters = {
    ...EMPTY_FILTERS,
    from: 'electrical-engineering',
    to: 'dental-school',
    constraint: ['low-gpa', 'no-network'],
    verificationTier: ['institution-verified'],
    contactableOnly: true,
    gradYearMin: 2016,
    sort: 'shortest',
    page: 2,
  };

  const round = filtersFromSearchParams(filtersToSearchParams(filters));
  assert.deepEqual(round, filters, 'a shared link must reopen the identical result set');
});

test('default values are omitted so equivalent states produce identical URLs', () => {
  assert.equal(filtersToQueryString(EMPTY_FILTERS), '');
  const a = filtersToQueryString({ ...EMPTY_FILTERS, sort: 'relevance', page: 1 });
  assert.equal(a, '', 'defaults must not appear in the URL');
});

test('a malformed shared link degrades to a broader search instead of erroring', () => {
  const params = new URLSearchParams(
    'from=electrical-engineering&verificationTier=not-a-real-tier&sort=bogus&page=-4',
  );
  const filters = filtersFromSearchParams(params);
  assert.equal(filters.from, 'electrical-engineering', 'valid parts survive');
  assert.deepEqual(filters.verificationTier, [], 'invalid enum dropped');
  assert.equal(filters.sort, 'relevance', 'invalid sort falls back to default');
  assert.equal(filters.page, 1);
});

test('active filter count reflects what the user applied', () => {
  const filters = {
    ...EMPTY_FILTERS,
    constraint: ['low-gpa', 'no-network'],
    contactableOnly: true,
    gradYearMin: 2016,
  };
  assert.equal(activeFilterCount(filters), 4);
});

// -------------------------------------------------------------------- facets

test('facet counts match an independent count over the corpus', () => {
  const result = search(docs, EMPTY_FILTERS);
  assert.equal(result.total, docs.length);

  for (const facet of result.facets.verificationTier) {
    const expected = docs.filter((d) => d.verificationTier === facet.value).length;
    assert.equal(facet.count, expected, `tier ${facet.value} miscounted`);
  }

  for (const facet of result.facets.transitionType) {
    const expected = docs.filter((d) => d.transitionType === facet.value).length;
    assert.equal(facet.count, expected, `transitionType ${facet.value} miscounted`);
  }

  for (const facet of result.facets.constraint) {
    const expected = docs.filter((d) => d.constraints.includes(facet.value)).length;
    assert.equal(facet.count, expected, `constraint ${facet.value} miscounted`);
  }
});

test('facet counts respect other applied filters', () => {
  const filters = { ...EMPTY_FILTERS, contactableOnly: true };
  const result = search(docs, filters);
  const contactable = docs.filter((d) => d.contactable);
  assert.equal(result.total, contactable.length);

  for (const facet of result.facets.verificationTier) {
    const expected = contactable.filter((d) => d.verificationTier === facet.value).length;
    assert.equal(facet.count, expected, 'facet counts must reflect the active filter set');
  }
});

test('a facet does not collapse its own sibling options when selected', () => {
  // Multi-select is unusable if picking one tier zeroes out the others.
  const before = search(docs, EMPTY_FILTERS).facets.verificationTier;
  const after = search(docs, {
    ...EMPTY_FILTERS,
    verificationTier: ['institution-verified'],
  }).facets.verificationTier;

  assert.deepEqual(
    after.map((f) => `${f.value}:${f.count}`).sort(),
    before.map((f) => `${f.value}:${f.count}`).sort(),
    'selecting within a facet must leave its own counts intact',
  );
});

test('a filter from a different facet does narrow the counts', () => {
  const all = search(docs, EMPTY_FILTERS).facets.constraint;
  const narrowed = search(docs, {
    ...EMPTY_FILTERS,
    verificationTier: ['institution-verified'],
  }).facets.constraint;

  const totalAll = all.reduce((s, f) => s + f.count, 0);
  const totalNarrowed = narrowed.reduce((s, f) => s + f.count, 0);
  assert.ok(totalNarrowed < totalAll, 'a cross-facet filter must narrow counts');
});

test('filtering returns only matching documents', () => {
  const result = search(docs, { ...EMPTY_FILTERS, to: 'dental-school' });
  assert.ok(result.total > 0);
  for (const doc of result.docs) assert.equal(doc.toId, 'dental-school');
});

test('pagination does not change the total', () => {
  const p1 = search(docs, { ...EMPTY_FILTERS, page: 1 });
  const p2 = search(docs, { ...EMPTY_FILTERS, page: 2 });
  assert.equal(p1.total, p2.total);
  assert.notDeepEqual(
    p1.docs.map((d) => d.id),
    p2.docs.map((d) => d.id),
  );
});

// ------------------------------------------------------------------- ranking

test('engagement is never a ranking input', () => {
  // The SearchDoc type omits view/save counts entirely; assert that stays true,
  // because reintroducing them is exactly how "reference tool" becomes "feed".
  for (const doc of docs) {
    assert.equal('viewCount' in doc, false, 'viewCount must not reach the index');
    assert.equal('savedCount' in doc, false, 'savedCount must not reach the index');
  }
});

test('verification outranks completeness, which outranks recency', () => {
  const base = {
    id: 'a', canonicalSlug: 's', fromId: 'x', fromLabel: 'X', toId: 'y', toLabel: 'Y',
    transitionType: 'field-switch', institution: null, major: 'M', industry: null,
    locations: [], graduationYear: 2020, backgroundTags: [], constraints: [],
    durationMonths: 24, stepCount: 5, hasObstaclesDocumented: true, contactable: false,
    outcomeResult: 'r', text: 't',
    createdAt: '2020-01-01T00:00:00.000Z', updatedAt: '2020-01-01T00:00:00.000Z',
  };

  const verified = { ...base, id: 'v', verificationTier: 'institution-verified', completenessScore: 40 };
  const complete = { ...base, id: 'c', verificationTier: 'unverified', completenessScore: 100 };
  const filters = EMPTY_FILTERS;

  assert.ok(
    relevanceScore(verified, filters) > relevanceScore(complete, filters),
    'a verified pathway must outrank a merely detailed one',
  );

  const recent = { ...base, id: 'r', verificationTier: 'unverified', completenessScore: 40, updatedAt: new Date().toISOString() };
  assert.ok(
    relevanceScore(complete, filters) > relevanceScore(recent, filters),
    'completeness must outrank recency',
  );
});

test('an exact transition match outranks everything else', () => {
  const filters = { ...EMPTY_FILTERS, from: 'electrical-engineering', to: 'dental-school' };
  const result = search(docs, filters);
  const top = result.docs[0];
  assert.equal(top.fromId, 'electrical-engineering');
  assert.equal(top.toId, 'dental-school');
});

test('sorting by shortest duration actually sorts by duration', () => {
  const result = search(docs, { ...EMPTY_FILTERS, sort: 'shortest' });
  for (let i = 1; i < result.docs.length; i += 1) {
    assert.ok(result.docs[i - 1].durationMonths <= result.docs[i].durationMonths);
  }
});

// -------------------------------------------------------------- empty state

test('an empty result set offers adjacent transitions, not a dead end', () => {
  const filters = { ...EMPTY_FILTERS, from: 'electrical-engineering', to: 'law-school' };
  const result = search(docs, filters);
  assert.equal(result.total, 0, 'this exact transition is not in the seed corpus');

  const adjacent = adjacentTransitions(docs, filters);
  assert.ok(adjacent.length > 0, 'the empty state must offer somewhere to go');

  const hasSameOrigin = adjacent.some((a) => a.relation === 'same-origin');
  const hasSameDestination = adjacent.some((a) => a.relation === 'same-destination');
  assert.ok(hasSameOrigin, 'should offer other destinations from the same origin');
  assert.ok(hasSameDestination, 'should offer other origins reaching the same destination');

  for (const suggestion of adjacent) {
    assert.ok(suggestion.count > 0, 'never suggest a route that is also empty');
  }
});

// ------------------------------------------------------- natural language

test('a natural-language query parses into filters AND a visible interpretation', () => {
  const parsed = parseQuery("I'm an EE major who wants to do dentistry", SEED_TAXONOMY);
  assert.equal(parsed.filters.from, 'electrical-engineering');
  assert.equal(parsed.filters.to, 'dental-school');

  // The interpretation must be traceable back to the user's own words.
  const fromToken = parsed.tokens.find((t) => t.field === 'from');
  assert.ok(fromToken, 'the parse must be shown, not applied silently');
  assert.match(fromToken.sourceText, /EE/i);
});

test('the parser extracts constraints without swallowing the endpoints', () => {
  const parsed = parseQuery('electrical engineering to dental school with a low GPA', SEED_TAXONOMY);
  assert.equal(parsed.filters.from, 'electrical-engineering');
  assert.equal(parsed.filters.to, 'dental-school');
  assert.deepEqual(parsed.filters.constraint, ['low-gpa']);
  assert.ok(parsed.tokens.some((t) => t.field === 'constraint'));
});

test('unparseable input is preserved rather than silently dropped', () => {
  const parsed = parseQuery('something entirely unrecognizable here', SEED_TAXONOMY);
  assert.ok(parsed.unmatched.length > 0, 'the user must see what was not understood');
  assert.equal(parsed.filters.q, 'something entirely unrecognizable here');
});

test('a bare destination is not turned into a guessed origin', () => {
  const parsed = parseQuery('dental school', SEED_TAXONOMY);
  assert.equal(parsed.filters.to, 'dental-school');
  assert.equal(parsed.filters.from, undefined, 'never invent a direction the user did not state');
});

test('the arrow form parses', () => {
  const parsed = parseQuery('nursing → medical school', SEED_TAXONOMY);
  assert.equal(parsed.filters.from, 'nursing');
  assert.equal(parsed.filters.to, 'medical-school');
});
