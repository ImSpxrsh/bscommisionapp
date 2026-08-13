/**
 * The preset is GENERATED from packages/ui-tokens. Nothing here may define a
 * colour, size, or spacing value — extending the theme locally would reintroduce
 * exactly the drift the token package exists to prevent.
 */
const preset = require('@precedent/ui-tokens/tailwind-preset');

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [preset],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
};
