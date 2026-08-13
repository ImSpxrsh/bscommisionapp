/**
 * Domain ↔ persistence parity.
 *
 * `packages/core` is the source of truth for shape and validation;
 * `services/api/prisma/schema.prisma` is the persistence mirror. Adding a step
 * type to one and not the other is a silent data-loss bug, so the two are
 * compared here.
 *
 * Prisma enum members can't contain hyphens or start with a digit, so the
 * mirror uses snake_case and prefixes numeric bands. `normalize` undoes exactly
 * those two transformations — nothing else — so a genuine divergence still fails.
 */

import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  SIGNAL_KINDS,
  STEP_TYPES,
  TRANSITION_TYPES,
  VERIFICATION_TIERS,
} from '../dist/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const schema = readFileSync(
  join(here, '..', '..', '..', 'services', 'api', 'prisma', 'schema.prisma'),
  'utf8',
);

/** Extracts the members of a named enum block from the Prisma schema. */
function prismaEnum(name) {
  const match = schema.match(new RegExp(`enum\\s+${name}\\s*\\{([^}]*)\\}`));
  assert.ok(match, `Prisma schema is missing enum ${name}`);
  return match[1]
    .split('\n')
    .map((l) => l.replace(/\/\/.*$/, '').trim())
    .filter(Boolean);
}

const normalize = (v) => v.replace(/_/g, '-');

const CASES = [
  ['StepType', STEP_TYPES],
  ['VerificationTier', VERIFICATION_TIERS],
  ['SignalKind', SIGNAL_KINDS, (v) => v],
  ['TransitionType', TRANSITION_TYPES],
];

for (const [enumName, domainValues, transform = normalize] of CASES) {
  test(`Prisma ${enumName} matches the domain model`, () => {
    const inSchema = prismaEnum(enumName).map(transform).sort();
    const inDomain = [...domainValues].sort();
    assert.deepEqual(
      inSchema,
      inDomain,
      `${enumName} drifted between packages/core and schema.prisma`,
    );
  });
}

test('every step type is persistable', () => {
  const persisted = new Set(prismaEnum('StepType'));
  for (const type of STEP_TYPES) {
    assert.ok(persisted.has(type), `step type "${type}" has no column value`);
  }
});

test('the private fields are documented as private in the schema', () => {
  // These three are the fields whose leakage would be most damaging. If someone
  // removes the warning comment, they should have to think about why.
  for (const field of ['realName', 'relayAddress']) {
    const idx = schema.indexOf(`  ${field} `);
    assert.ok(idx > 0, `${field} missing from schema`);
    const preceding = schema.slice(Math.max(0, idx - 400), idx);
    assert.ok(
      /PRIVATE/.test(preceding),
      `${field} must carry a PRIVATE annotation in the schema`,
    );
  }
});

test('pathway children cascade on delete, so deletion is real deletion', () => {
  // TRUST.md commits to real deletion. A child table that does not cascade
  // leaves biography behind after an erasure request.
  const childModels = ['Step', 'VerificationSignal', 'PathwayLocation', 'FieldVisibilitySetting'];
  for (const model of childModels) {
    const block = schema.match(new RegExp(`model\\s+${model}\\s*\\{([\\s\\S]*?)\\n\\}`));
    assert.ok(block, `missing model ${model}`);
    assert.ok(
      /onDelete:\s*Cascade/.test(block[1]),
      `${model} must cascade from Pathway or deleted pathways leave residue`,
    );
  }
});
