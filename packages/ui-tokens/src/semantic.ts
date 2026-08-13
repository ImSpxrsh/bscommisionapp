/**
 * Semantic color roles — the layer apps actually consume.
 *
 * Every role resolves to a light and a dark value, both chosen deliberately.
 * Dark mode is a selected set of steps, never an automatic inversion.
 */

import { brand, dark, neutral, status } from './primitives.js';

export type ColorPair = { light: string; dark: string };

export const color = {
  /** Page background, behind all surfaces. */
  pageBg: { light: neutral[50], dark: dark.page },
  /** Default card / panel surface. Categorical hues were validated against this. */
  surface: { light: neutral[0], dark: dark.surface },
  /** Raised surface: popovers, sheets, sticky rails. */
  surfaceElevated: { light: neutral[0], dark: dark.elevated },
  /** Recessed surface: setback steps, disabled rows, code blocks. */
  surfaceSunken: { light: neutral[50], dark: dark.sunken },
  /** Hover wash over a surface. */
  surfaceHover: { light: neutral[100], dark: '#1F2937' },
  /** Selected / active row. */
  surfaceSelected: { light: brand[50], dark: '#16283D' },

  /** Primary body and heading ink. */
  ink: { light: neutral[900], dark: '#F1F5F9' },
  /** Secondary ink: supporting copy, descriptions. */
  inkSecondary: { light: neutral[600], dark: '#B6C2D2' },
  /** Muted ink: metadata, axis labels, timestamps. Still clears 4.5:1. */
  inkMuted: { light: neutral[500], dark: '#94A3B8' },
  /**
   * Ink on a saturated/brand fill. Dark mode flips to dark ink: the dark-theme
   * accent is a light blue, so white-on-accent only reaches 3.57:1 there.
   */
  inkOnAccent: { light: neutral[0], dark: dark.page },

  /** Hairline border — the primary separation device in this system. */
  border: { light: neutral[200], dark: '#26313F' },
  /** Stronger border for inputs and focused containers. */
  borderStrong: { light: neutral[300], dark: '#33404F' },

  /** Brand navy for primary actions and UI chrome. Never encodes data. */
  accent: { light: brand[500], dark: '#5B8AC4' },
  accentHover: { light: brand[600], dark: '#7BA5D6' },
  accentSubtle: { light: brand[50], dark: '#16283D' },

  /** Focus ring. Must be visible in both themes on every interactive element. */
  focusRing: { light: brand[500], dark: '#7BA5F5' },

  destructive: status.critical,
  success: status.good,
  warning: status.warning,
  info: status.info,
} as const satisfies Record<string, ColorPair>;

export type SemanticColor = keyof typeof color;
