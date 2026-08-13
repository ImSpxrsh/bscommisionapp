/**
 * Writes the generated token artifacts into `dist/`.
 * Run with `npm run tokens` from the repo root.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildCssVariables, buildNativeTheme, buildTailwindPreset } from './emit.js';

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, '..', 'dist');

mkdirSync(dist, { recursive: true });

const artifacts: Array<[string, string]> = [
  ['tokens.css', buildCssVariables()],
  ['tailwind-preset.cjs', buildTailwindPreset()],
  [
    'native-theme.json',
    `${JSON.stringify(
      { light: buildNativeTheme('light'), dark: buildNativeTheme('dark') },
      null,
      2,
    )}\n`,
  ],
];

for (const [name, contents] of artifacts) {
  writeFileSync(join(dist, name), contents, 'utf8');
  console.log(`  emitted dist/${name}  (${contents.length.toLocaleString()} bytes)`);
}

console.log('tokens: ok');
