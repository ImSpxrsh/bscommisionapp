/**
 * Step-type visual encoding.
 *
 * There are 14 step types but a categorical palette may never exceed 8 hues,
 * and hues are never cycled. So step types are grouped into 7 hue FAMILIES,
 * assigned to fixed categorical slots; within a family the icon and the visible
 * label carry the distinction. This keeps the timeline legible under colour
 * vision deficiency and in print.
 *
 * `setback` is deliberately NOT given a hue. It is a state, not a category, and
 * the design direction calls for setbacks to read as recessed rather than
 * alarming. It renders on the sunken surface with muted ink and a neutral rule.
 * Reserving red for destructive UI also keeps a setback from looking like an
 * error the user must fix.
 */

import { STEP_TYPES, type StepType } from '@precedent/core';

import { categorical, categoricalOrder, neutral } from './primitives.js';

/**
 * The step-type list is a DOMAIN fact and lives in `@precedent/core`. This
 * module owns only its visual encoding. Re-exported for convenience so a
 * component needs one import, not two.
 */
export { STEP_TYPES };
export type { StepType };

export const STEP_FAMILIES = [
  'education',
  'work',
  'output',
  'movement',
  'process',
  'money',
  'turningPoint',
  'setback',
] as const;

export type StepFamily = (typeof STEP_FAMILIES)[number];

/** Which hue family each step type belongs to. */
export const stepTypeFamily: Record<StepType, StepFamily> = {
  coursework: 'education',
  exam: 'education',
  certification: 'education',

  internship: 'work',
  job: 'work',

  research: 'output',
  project: 'output',

  transfer: 'movement',
  relocation: 'movement',

  application: 'process',
  networking: 'process',

  financial: 'money',

  pivot: 'turningPoint',

  setback: 'setback',
};

/**
 * Family → categorical slot. Slot order is fixed and load-bearing: it is what
 * the CVD validation ran against. Do not reorder to taste.
 */
const familySlot: Record<Exclude<StepFamily, 'setback'>, (typeof categoricalOrder)[number]> = {
  education: 'blue',
  work: 'orange',
  output: 'aqua',
  movement: 'yellow',
  process: 'magenta',
  money: 'green',
  turningPoint: 'violet',
};

export type StepFamilyStyle = {
  /** The encoding hue, or null for `setback`, which is neutral by design. */
  color: { light: string; dark: string } | null;
  label: string;
  /** Lucide icon name. SVG only — never an emoji. */
  icon: string;
};

export const stepFamilyStyle: Record<StepFamily, StepFamilyStyle> = {
  education: { color: categorical[familySlot.education], label: 'Education', icon: 'graduation-cap' },
  work: { color: categorical[familySlot.work], label: 'Work', icon: 'briefcase' },
  output: { color: categorical[familySlot.output], label: 'Research & projects', icon: 'flask-conical' },
  movement: { color: categorical[familySlot.movement], label: 'Move', icon: 'arrow-left-right' },
  process: { color: categorical[familySlot.process], label: 'Applications & outreach', icon: 'send' },
  money: { color: categorical[familySlot.money], label: 'Financial', icon: 'banknote' },
  turningPoint: { color: categorical[familySlot.turningPoint], label: 'Pivot', icon: 'git-fork' },
  setback: {
    color: null,
    label: 'Setback',
    icon: 'trending-down',
  },
};

/** Per-step-type label and icon. The within-family distinguisher. */
export const stepTypeMeta: Record<StepType, { label: string; icon: string }> = {
  coursework: { label: 'Coursework', icon: 'book-open' },
  internship: { label: 'Internship', icon: 'briefcase' },
  research: { label: 'Research', icon: 'flask-conical' },
  exam: { label: 'Exam', icon: 'file-check' },
  certification: { label: 'Certification', icon: 'award' },
  job: { label: 'Job', icon: 'building-2' },
  transfer: { label: 'Transfer', icon: 'arrow-left-right' },
  application: { label: 'Application', icon: 'send' },
  networking: { label: 'Networking', icon: 'users' },
  project: { label: 'Project', icon: 'hammer' },
  setback: { label: 'Setback', icon: 'trending-down' },
  pivot: { label: 'Pivot', icon: 'git-fork' },
  financial: { label: 'Financial', icon: 'banknote' },
  relocation: { label: 'Relocation', icon: 'map-pin' },
};

/** Neutral treatment for setback steps: recessed, not hidden, never red. */
export const setbackTreatment = {
  rule: { light: neutral[400], dark: '#64748B' },
  ink: { light: neutral[600], dark: '#94A3B8' },
} as const;

export function styleForStepType(type: StepType): StepFamilyStyle {
  return stepFamilyStyle[stepTypeFamily[type]];
}

/** Resolve a step type to its encoding hex for a given theme, or null for setback. */
export function stepColor(type: StepType, theme: 'light' | 'dark'): string | null {
  const { color } = styleForStepType(type);
  return color ? color[theme] : null;
}
