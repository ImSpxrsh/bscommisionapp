/**
 * Precedent — primitive design tokens.
 *
 * SOURCE OF TRUTH. Derived from `design-system/precedent/MASTER.md` and the
 * design-direction constraints recorded in `design-system/OVERRIDES.md`.
 *
 * Nothing in apps/ or packages/ may hardcode a hex value, font size, spacing
 * number, radius, or duration. Import from `@precedent/ui-tokens` instead.
 *
 * Primitives are raw values with no meaning attached. Meaning is assigned in
 * `semantic.ts` (surfaces, ink, borders) and in the encoding modules
 * (`step-types.ts`, `verification.ts`). Consumers should almost always use the
 * semantic layer — a primitive is only referenced directly when defining one.
 */

/** Slate-based neutral ramp. The product is neutral by default; see OVERRIDES.md. */
export const neutral = {
  0: '#FFFFFF',
  50: '#F8FAFC',
  100: '#F1F5F9',
  200: '#E2E8F0',
  300: '#CBD5E1',
  400: '#94A3B8',
  500: '#64748B',
  600: '#475569',
  700: '#334155',
  800: '#1E293B',
  900: '#0F172A',
  950: '#020617',
} as const;

/**
 * Warm neutrals for the marketing surface only.
 *
 * The slate ramp above is correct for the tool — it is cool, recessive, and gets
 * out of the way of the step-type hues. It is also unwelcoming, which is the
 * wrong first impression for a product whose primary reader is a 16-year-old
 * deciding whether this is for them. The landing page sits on these instead;
 * every surface behind actual data stays slate. See OVERRIDES.md #11.
 */
export const warm = {
  50: '#FDFBF7',
  100: '#F7F2E9',
  200: '#EDE4D6',
} as const;

/**
 * Dark-mode planes. Slate-tinted rather than pure black so the neutral ramp and
 * the dark step-type hues sit on a consistent surface. `surface` is the value
 * the categorical palette was validated against — see OVERRIDES.md.
 */
export const dark = {
  page: '#0B1017',
  surface: '#131A23',
  elevated: '#1B2430',
  sunken: '#080C12',
} as const;

/** Brand navy. UI chrome only — never used to encode data. */
export const brand = {
  50: '#EEF3F9',
  100: '#D8E3F0',
  200: '#B0C6E0',
  300: '#7B9BC4',
  400: '#4A6E9E',
  500: '#1E3A5F',
  600: '#1A3253',
  700: '#152840',
  800: '#101E30',
  900: '#0B1523',
} as const;

/**
 * Categorical hues for step-type encoding, in FIXED slot order.
 *
 * Validated with the data-viz palette validator against Precedent's own
 * surfaces (light `#FFFFFF`, dark `#131A23`) — both modes pass the lightness
 * band, chroma floor, CVD separation, and normal-vision floor. Light mode
 * returns a sub-3:1 contrast WARN on aqua/yellow/magenta; the relief rule is
 * satisfied because every timeline node ships a visible text label and the
 * legend is always present. Slots are assigned in order and NEVER cycled.
 *
 * Slot 8 (red) is deliberately left out of the series so red stays reserved for
 * destructive UI and critical status.
 */
export const categorical = {
  blue: { light: '#2A78D6', dark: '#3987E5' },
  orange: { light: '#EB6834', dark: '#D95926' },
  aqua: { light: '#1BAF7A', dark: '#199E70' },
  yellow: { light: '#EDA100', dark: '#C98500' },
  magenta: { light: '#E87BA4', dark: '#D55181' },
  green: { light: '#008300', dark: '#008300' },
  violet: { light: '#4A3AA7', dark: '#9085E9' },
} as const;

/** Fixed slot order. Index = slot. Do not reorder — ordering is the CVD-safety mechanism. */
export const categoricalOrder = [
  'blue',
  'orange',
  'aqua',
  'yellow',
  'magenta',
  'green',
  'violet',
] as const;

/** Reserved status hues. Never reused as a series color; always paired with icon + label. */
export const status = {
  good: { light: '#0F7A3D', dark: '#22B45C' },
  warning: { light: '#B45309', dark: '#F0A93B' },
  critical: { light: '#B91C1C', dark: '#F27272' },
  info: { light: '#1D4ED8', dark: '#7BA5F5' },
} as const;

/**
 * Type scale. Modular, 14px base for the data-dense desktop surface.
 * Values are rem strings for web; `packages/ui-tokens/src/build.ts` emits the
 * px equivalents for React Native, which has no rem unit.
 */
export const fontSize = {
  '2xs': { rem: '0.6875rem', px: 11, lineHeight: 1.45 },
  xs: { rem: '0.75rem', px: 12, lineHeight: 1.5 },
  sm: { rem: '0.8125rem', px: 13, lineHeight: 1.54 },
  base: { rem: '0.875rem', px: 14, lineHeight: 1.57 },
  md: { rem: '1rem', px: 16, lineHeight: 1.6 },
  lg: { rem: '1.125rem', px: 18, lineHeight: 1.55 },
  xl: { rem: '1.375rem', px: 22, lineHeight: 1.4 },
  '2xl': { rem: '1.75rem', px: 28, lineHeight: 1.28 },
  '3xl': { rem: '2.25rem', px: 36, lineHeight: 1.2 },
  '4xl': { rem: '3rem', px: 48, lineHeight: 1.08 },
  /**
   * Display sizes. Marketing surfaces only — the landing page and the empty
   * hero of a first run. See OVERRIDES.md #11: override #1 caps the *tool* type
   * scale at 4xl because oversized type costs rows on a results list, and
   * explicitly names oversized display type as a landing-page device.
   */
  '5xl': { rem: '3.75rem', px: 60, lineHeight: 1.04 },
  '6xl': { rem: '4.5rem', px: 72, lineHeight: 1 },
} as const;

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

export const letterSpacing = {
  tighter: '-0.02em',
  tight: '-0.011em',
  normal: '0em',
  wide: '0.02em',
  /** Small-caps data labels and eyebrow text. */
  caps: '0.06em',
} as const;

/**
 * Two families, per the design direction: a grotesque for UI chrome and data
 * labels, and a high-legibility text face for pathway prose.
 */
export const fontFamily = {
  ui: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
  text: ['Source Serif 4', 'Iowan Old Style', 'Georgia', 'serif'],
  mono: ['IBM Plex Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
  /**
   * Rounded geometric, for marketing headlines only — never for data, labels,
   * or anything inside the tool. Inter at 72px is competent and cold; the
   * rounded terminals are most of what makes a landing page read as approachable
   * to a sixteen-year-old. See OVERRIDES.md #11.
   */
  display: ['Nunito', 'Inter', 'system-ui', 'sans-serif'],
} as const;

/** 4px base grid. */
export const space = {
  0: 0,
  px: 1,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
} as const;

/** Restrained radii — this is a reference document, not a consumer app. */
export const radius = {
  none: 0,
  sm: 2,
  md: 4,
  lg: 6,
  xl: 10,
  full: 9999,
} as const;

export const borderWidth = {
  hairline: 1,
  thick: 2,
  /** Timeline rails and step-type left rules. */
  rule: 3,
} as const;

/**
 * Swiss-style depth: hairline borders do the work, shadows are a last resort
 * reserved for genuinely floating layers.
 */
export const shadow = {
  none: 'none',
  sm: '0 1px 2px rgba(15, 23, 42, 0.06)',
  md: '0 4px 12px rgba(15, 23, 42, 0.08)',
  lg: '0 12px 32px rgba(15, 23, 42, 0.12)',
} as const;

export const duration = {
  instant: 0,
  fast: 150,
  base: 200,
  slow: 300,
} as const;

export const easing = {
  standard: 'cubic-bezier(0.2, 0, 0.2, 1)',
  enter: 'cubic-bezier(0, 0, 0.2, 1)',
  exit: 'cubic-bezier(0.4, 0, 1, 1)',
} as const;

/**
 * Web breakpoints, as min-widths.
 *
 * These are deliberately NOT the same numbers as the verification widths below.
 * A breakpoint at 375 would be active on the narrowest phone we support, which
 * makes `sm:` useless as a "wider than a phone" modifier — the smallest layout
 * has to be the unprefixed base, with each breakpoint marking a real change.
 */
export const breakpoint = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1440,
} as const;

/**
 * The widths the pre-delivery checklist requires every surface to be verified
 * at. 375 is the narrowest supported phone and is covered by the base styles.
 */
export const VERIFY_WIDTHS = [375, 768, 1024, 1440] as const;

/** Minimum touch target, in points. Enforced on every mobile control. */
export const touchTarget = { min: 44 } as const;

export const zIndex = {
  base: 0,
  sticky: 10,
  header: 20,
  overlay: 30,
  modal: 40,
  toast: 50,
} as const;
