/**
 * Steps — the actual unit of value in Precedent.
 *
 * The reason this beats a forum thread is that `setback` and `pivot` are
 * first-class step types. Most pathway content online is survivorship-sanitized:
 * it records what worked and silently drops the two years that did not. A
 * taxonomy that can't express a rejection can't represent a real pathway.
 */

import { z } from 'zod';
import { YearMonth, compareYearMonth, monthsBetween } from './primitives.js';

export const STEP_TYPES = [
  'coursework',
  'internship',
  'research',
  'exam',
  'certification',
  'job',
  'transfer',
  'application',
  'networking',
  'project',
  'setback',
  'pivot',
  'financial',
  'relocation',
] as const;

export const StepType = z.enum(STEP_TYPES);
export type StepType = z.infer<typeof StepType>;

/**
 * An obstacle attached to a step. `howResolved` is required — an obstacle with
 * no resolution is a complaint, and the product's job is to record what someone
 * actually did about it.
 */
export const Obstacle = z.object({
  description: z.string().min(1).max(2000),
  howResolved: z.string().min(1).max(2000),
});
export type Obstacle = z.infer<typeof Obstacle>;

export const Step = z
  .object({
    id: z.string().min(1),
    order: z.number().int().min(0),
    startDate: YearMonth,
    /** Null means ongoing. */
    endDate: YearMonth.nullable(),
    ongoing: z.boolean().default(false),
    type: StepType,
    title: z.string().min(1).max(200),
    organization: z.string().max(200).optional(),
    description: z.string().max(5000).optional(),
    /** Submitter-flagged turning point. Emphasized on the timeline. */
    wasPivotal: z.boolean().default(false),
    obstacle: Obstacle.optional(),
    /** Feeds the verification pipeline as a `public_profile_url` signal. */
    evidenceUrl: z.string().url().optional(),
    advice: z.string().max(2000).optional(),
  })
  .superRefine((step, ctx) => {
    if (step.ongoing && step.endDate !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'An ongoing step cannot have an end date.',
      });
    }
    if (!step.ongoing && step.endDate === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'A step must either have an end date or be marked ongoing.',
      });
    }
    if (step.endDate && compareYearMonth(step.startDate, step.endDate) > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'A step cannot end before it starts.',
      });
    }
  });

export type Step = z.infer<typeof Step>;

/** Duration in months. Ongoing steps measure to `asOf`. */
export function stepDuration(step: Step, asOf: YearMonth): number {
  const end = step.endDate ?? asOf;
  return Math.max(monthsBetween(step.startDate, end), 0);
}

/** Chronological order, ties broken by the submitter's explicit ordering. */
export function sortSteps(steps: readonly Step[]): Step[] {
  return [...steps].sort((a, b) => {
    const byDate = compareYearMonth(a.startDate, b.startDate);
    return byDate !== 0 ? byDate : a.order - b.order;
  });
}

/**
 * Steps legitimately overlap — someone works while studying — so overlap is not
 * an error. This reports it so the timeline renderer can lane them side by side
 * instead of stacking them misleadingly.
 */
export function overlappingSteps(steps: readonly Step[], asOf: YearMonth): Array<[string, string]> {
  const sorted = sortSteps(steps);
  const pairs: Array<[string, string]> = [];
  for (let i = 0; i < sorted.length; i += 1) {
    for (let j = i + 1; j < sorted.length; j += 1) {
      const a = sorted[i]!;
      const b = sorted[j]!;
      const aEnd = a.endDate ?? asOf;
      if (compareYearMonth(b.startDate, aEnd) < 0) pairs.push([a.id, b.id]);
    }
  }
  return pairs;
}

export function hasDocumentedObstacle(steps: readonly Step[]): boolean {
  return steps.some((s) => s.obstacle !== undefined || s.type === 'setback');
}

/** Total elapsed months from the first step's start to the last step's end. */
export function totalDuration(steps: readonly Step[], asOf: YearMonth): number {
  if (steps.length === 0) return 0;
  const sorted = sortSteps(steps);
  const first = sorted[0]!;
  let latest = first.endDate ?? asOf;
  for (const s of sorted) {
    const end = s.endDate ?? asOf;
    if (compareYearMonth(end, latest) > 0) latest = end;
  }
  return Math.max(monthsBetween(first.startDate, latest), 0);
}
