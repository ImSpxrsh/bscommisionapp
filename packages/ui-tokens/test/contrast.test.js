/**
 * Token gates, run in CI.
 *
 * The pre-delivery checklist requires >= 4.5:1 text contrast in BOTH themes and a
 * visible focus ring. Those are computable, so they are computed here rather than
 * eyeballed. A token change that breaks contrast fails the build.
 */

import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const theme = JSON.parse(
  readFileSync(join(here, '..', 'dist', 'native-theme.json'), 'utf8'),
);

/** sRGB relative luminance, per WCAG 2.1. */
function luminance(hex) {
  const v = hex.replace('#', '');
  const parts = [v.slice(0, 2), v.slice(2, 4), v.slice(4, 6)].map((h) => {
    const c = parseInt(h, 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * parts[0] + 0.7152 * parts[1] + 0.0722 * parts[2];
}

function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const MODES = ['light', 'dark'];

for (const mode of MODES) {
  const c = theme[mode].color;

  test(`${mode}: body ink clears 4.5:1 on every surface`, () => {
    for (const surface of [
      'surface',
      'pageBg',
      'surfaceElevated',
      'surfaceSunken',
      // The marketing surfaces are warm rather than slate, so they get the same
      // gate as the product ones — a landing page is not exempt from contrast.
      'landingBg',
      'landingSurface',
      'landingSunken',
    ]) {
      const ratio = contrast(c.ink, c[surface]);
      assert.ok(
        ratio >= 4.5,
        `ink ${c.ink} on ${surface} ${c[surface]} = ${ratio.toFixed(2)}:1, need 4.5`,
      );
    }
  });

  test(`${mode}: secondary and muted ink clear 4.5:1 on the default surface`, () => {
    for (const role of ['inkSecondary', 'inkMuted']) {
      const ratio = contrast(c[role], c.surface);
      assert.ok(
        ratio >= 4.5,
        `${role} ${c[role]} on surface ${c.surface} = ${ratio.toFixed(2)}:1, need 4.5`,
      );
    }
  });

  test(`${mode}: ink-on-accent clears 4.5:1 (primary buttons)`, () => {
    const ratio = contrast(c.inkOnAccent, c.accent);
    assert.ok(ratio >= 4.5, `on-accent = ${ratio.toFixed(2)}:1, need 4.5`);
  });

  test(`${mode}: focus ring clears 3:1 against page and surface`, () => {
    for (const surface of ['surface', 'pageBg']) {
      const ratio = contrast(c.focusRing, c[surface]);
      assert.ok(
        ratio >= 3,
        `focusRing on ${surface} = ${ratio.toFixed(2)}:1, need 3 (non-text UI)`,
      );
    }
  });

  test(`${mode}: every verification tier badge is readable`, () => {
    for (const [tier, style] of Object.entries(theme[mode].tier)) {
      const ratio = contrast(style.fg, style.bg);
      assert.ok(
        ratio >= 4.5,
        `tier ${tier}: fg ${style.fg} on bg ${style.bg} = ${ratio.toFixed(2)}:1, need 4.5`,
      );
    }
  });

  test(`${mode}: status colors are distinguishable from the surface`, () => {
    for (const [name, hex] of Object.entries(theme[mode].status)) {
      const ratio = contrast(hex, c.surface);
      assert.ok(ratio >= 3, `status ${name} = ${ratio.toFixed(2)}:1, need 3`);
    }
  });
}

test('verification tiers form a strict ordinal ladder', async () => {
  const { tierRank, VERIFICATION_TIERS } = await import('../dist/verification.js');
  const ranks = VERIFICATION_TIERS.map((t) => tierRank[t]);
  for (let i = 1; i < ranks.length; i += 1) {
    assert.ok(ranks[i] > ranks[i - 1], 'tier ranks must strictly increase');
  }
});

test('every step type maps to a family, and only setback is hueless', async () => {
  const { STEP_TYPES, stepTypeFamily, stepFamilyStyle, stepTypeMeta } = await import(
    '../dist/step-types.js'
  );
  for (const type of STEP_TYPES) {
    const family = stepTypeFamily[type];
    assert.ok(family, `${type} has no family`);
    assert.ok(stepTypeMeta[type]?.label, `${type} has no label`);
    assert.ok(stepTypeMeta[type]?.icon, `${type} has no icon`);
    const hasColor = stepFamilyStyle[family].color !== null;
    assert.equal(
      hasColor,
      type !== 'setback',
      `${type}: only setback may be hueless`,
    );
  }
});

test('step-type palette stays within the 8-hue categorical limit', async () => {
  const { stepFamilyStyle, STEP_FAMILIES } = await import('../dist/step-types.js');
  const hues = STEP_FAMILIES.map((f) => stepFamilyStyle[f].color)
    .filter(Boolean)
    .map((c) => c.light);
  assert.ok(hues.length <= 8, `${hues.length} hues, limit is 8`);
  assert.equal(new Set(hues).size, hues.length, 'hues must be unique — never cycled');
});

test('no step-type hue collides with a status color', async () => {
  const { stepFamilyStyle, STEP_FAMILIES } = await import('../dist/step-types.js');
  for (const mode of MODES) {
    const statusHexes = new Set(Object.values(theme[mode].status).map((h) => h.toUpperCase()));
    for (const family of STEP_FAMILIES) {
      const c = stepFamilyStyle[family].color;
      if (!c) continue;
      assert.ok(
        !statusHexes.has(c[mode].toUpperCase()),
        `${family} reuses a status color in ${mode} — status hues are reserved`,
      );
    }
  }
});
