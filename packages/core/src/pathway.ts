/**
 * The Pathway aggregate.
 *
 * A pathway is a timeline of discrete, comparable steps — structure first, prose
 * second. Free text is supporting evidence, never the primary payload, which is
 * why every narrative field is optional and every structural field is not.
 */

import { z } from 'zod';
import {
  CompensationBand,
  GpaBand,
  GraduationYear,
  Id,
  Location,
  YearMonth,
} from './primitives.js';
import { Step, sortSteps, totalDuration } from './step.js';
import { Verification } from './verification.js';
import { VisibilitySettings } from './privacy.js';
import { BackgroundTag, Constraint, Node, TransitionType } from './taxonomy/types.js';

export const Transition = z.object({
  from: Node,
  to: Node,
  canonicalSlug: z.string().min(1),
  transitionType: TransitionType,
});
export type Transition = z.infer<typeof Transition>;

export const Person = z.object({
  /** Shown when not anonymous and `displayName` is public. */
  displayName: z.string().max(120).optional(),
  /** Always present — the fallback identity for anonymous or restricted views. */
  pseudonym: z.string().min(1).max(120),
  /**
   * Private. Held for verification only and never serialized to any viewer,
   * share card, or search document. Pseudonymous authors can still reach
   * source-linked because checks run against this, not against the display name.
   */
  realName: z.string().max(120).optional(),
  isAnonymous: z.boolean().default(false),
  /** Self-declared only. Never inferred from any other field. */
  backgroundTags: z.array(BackgroundTag).default([]),
  graduationYear: GraduationYear.optional(),
  locations: z.array(Location).default([]),
  visibility: VisibilitySettings.optional(),
});
export type Person = z.infer<typeof Person>;

export const StartingPoint = z.object({
  institution: z.string().max(200).optional(),
  major: z.string().min(1).max(200),
  gpaBand: GpaBand.optional(),
  priorExperience: z.string().max(2000).optional(),
  /** The honest starting conditions. Self-declared. */
  constraints: z.array(Constraint).default([]),
});
export type StartingPoint = z.infer<typeof StartingPoint>;

export const Outcome = z.object({
  result: z.string().min(1).max(300),
  organization: z.string().max(200).optional(),
  date: YearMonth,
  /** Bands only — an exact figure is not representable by design. */
  compensationBand: CompensationBand.optional(),
  /** False when the person is still mid-transition. */
  isFinal: z.boolean().default(true),
});
export type Outcome = z.infer<typeof Outcome>;

export const Reflection = z.object({
  whatIdRepeat: z.array(z.string().max(500)).default([]),
  whatIdSkip: z.array(z.string().max(500)).default([]),
  biggestObstacle: z.string().max(2000).optional(),
  /** Naming luck is part of an honest account; survivorship bias hides it. */
  luckFactors: z.array(z.string().max(500)).default([]),
  costEstimate: z.string().max(200).optional(),
});
export type Reflection = z.infer<typeof Reflection>;

export const ContactPreferences = z.object({
  isOpen: z.boolean().default(false),
  mode: z.enum(['relay', 'none']).default('none'),
  topics: z.array(z.string().max(80)).default([]),
  /** Max inbound messages per week. Enforced server-side, never client-side. */
  rateLimit: z.number().int().min(0).max(50).default(3),
  /**
   * Private relay address. Never serialized to a viewer under any tier or any
   * contact state — outreach is routed, not forwarded.
   */
  relayAddress: z.string().optional(),
});
export type ContactPreferences = z.infer<typeof ContactPreferences>;

export const PathwayMeta = z.object({
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  viewCount: z.number().int().min(0).default(0),
  savedCount: z.number().int().min(0).default(0),
  reportCount: z.number().int().min(0).default(0),
});
export type PathwayMeta = z.infer<typeof PathwayMeta>;

export const Pathway = z
  .object({
    id: Id,
    transition: Transition,
    person: Person,
    startingPoint: StartingPoint,
    steps: z.array(Step).min(1),
    outcome: Outcome,
    reflection: Reflection.optional(),
    verification: Verification,
    contact: ContactPreferences,
    meta: PathwayMeta,
    /**
     * Set when the submitter explicitly attests there genuinely were no
     * obstacles. The submission flow blocks on zero obstacles unless this is
     * checked, so "frictionless" is always a deliberate claim rather than an
     * omission.
     */
    attestedNoObstacles: z.boolean().default(false),
  })
  .superRefine((p, ctx) => {
    if (p.steps.length === 0) return;
    const sorted = sortSteps(p.steps);
    const first = sorted[0]!;
    if (first.startDate > p.outcome.date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['outcome', 'date'],
        message: 'The outcome cannot predate the first step.',
      });
    }
    const ids = new Set(p.steps.map((s) => s.id));
    if (ids.size !== p.steps.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['steps'],
        message: 'Step ids must be unique.',
      });
    }
  });

export type Pathway = z.infer<typeof Pathway>;

/** Total elapsed months, measured to the outcome date for ongoing steps. */
export function pathwayDuration(pathway: Pathway): number {
  return totalDuration(pathway.steps, pathway.outcome.date);
}

/**
 * Completeness score, 0–100. Shown on every profile with its breakdown.
 *
 * This is deliberately visible and explained: a score that tells a submitter
 * exactly which field would raise it nudges quality far more effectively than a
 * badge does. It is a QUALITY signal, never an engagement one — nothing here
 * rewards posting frequency, recency, or popularity.
 */
export type CompletenessBreakdown = {
  score: number;
  components: Array<{ label: string; earned: number; possible: number; hint: string }>;
};

export function completenessScore(pathway: Pathway): CompletenessBreakdown {
  const steps = pathway.steps;
  const components: CompletenessBreakdown['components'] = [];

  const stepCount = Math.min(steps.length, 6);
  components.push({
    label: 'Steps documented',
    earned: Math.round((stepCount / 6) * 25),
    possible: 25,
    hint: 'Six or more steps gives a reader enough to follow the sequence.',
  });

  const described = steps.filter((s) => (s.description?.trim().length ?? 0) > 0).length;
  components.push({
    label: 'Steps with detail',
    earned: steps.length === 0 ? 0 : Math.round((described / steps.length) * 20),
    possible: 20,
    hint: 'Describe what each step actually involved.',
  });

  const obstacles = steps.filter((s) => s.obstacle || s.type === 'setback').length;
  const obstacleEarned = pathway.attestedNoObstacles
    ? 20
    : Math.min(obstacles, 2) * 10;
  components.push({
    label: 'Obstacles recorded',
    earned: obstacleEarned,
    possible: 20,
    hint: 'A pathway with no friction recorded is incomplete, not clean.',
  });

  const evidence = steps.filter((s) => s.evidenceUrl).length;
  components.push({
    label: 'Evidence attached',
    earned: Math.min(evidence, 3) * 5,
    possible: 15,
    hint: 'Link public evidence for the steps that can carry it.',
  });

  const r = pathway.reflection;
  const reflectionParts = [
    (r?.whatIdRepeat.length ?? 0) > 0,
    (r?.whatIdSkip.length ?? 0) > 0,
    !!r?.biggestObstacle,
    (r?.luckFactors.length ?? 0) > 0,
  ].filter(Boolean).length;
  components.push({
    label: 'Reflection',
    earned: reflectionParts * 2.5,
    possible: 10,
    hint: 'What you would repeat, skip, and what was luck.',
  });

  const baseline = [
    !!pathway.startingPoint.institution,
    !!pathway.startingPoint.gpaBand,
    pathway.startingPoint.constraints.length > 0,
  ].filter(Boolean).length;
  components.push({
    label: 'Starting conditions',
    earned: Math.round((baseline / 3) * 10),
    possible: 10,
    hint: 'Your honest baseline is what makes this relatable.',
  });

  const score = Math.round(
    Math.min(components.reduce((sum, c) => sum + c.earned, 0), 100),
  );
  return { score, components };
}

/**
 * A pathway with no friction recorded and no explicit attestation is marked
 * INCOMPLETE — never "clean". Survivorship-sanitized content is the main failure
 * mode of every pathway resource that already exists.
 */
export function isIncompleteOnFriction(pathway: Pathway): boolean {
  const hasFriction = pathway.steps.some((s) => s.obstacle || s.type === 'setback');
  return !hasFriction && !pathway.attestedNoObstacles;
}
