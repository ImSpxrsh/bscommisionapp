/**
 * Normalized taxonomy.
 *
 * "EE", "Electrical Engineering", and "Electrical & Computer Engineering" must
 * collapse to one node or facet counts lie and the compare view stops being
 * comparable. Canonical nodes are seeded from freely-licensed public datasets
 * only — no paid vendor data:
 *
 *   institution → IPEDS (US Dept. of Education, public domain)
 *   major       → CIP codes (NCES, public domain)
 *   role        → O*NET / SOC (US Dept. of Labor, CC BY / public domain)
 *
 * Free-text entry is always allowed. A submitter is never blocked because their
 * program or employer is missing from the seed: unmatched input becomes a
 * PROVISIONAL node routed to the admin merge queue, and the pathway stays fully
 * usable in the meantime.
 */

import { z } from 'zod';

/** What kind of thing a node names. */
export const NodeKind = z.enum(['institution', 'major', 'role', 'status']);
export type NodeKind = z.infer<typeof NodeKind>;

/**
 * The three node types a transition endpoint can be.
 *  - education: enrolled somewhere, studying something
 *  - role:      employed in some capacity
 *  - status:    neither — military, caregiving, unemployed, self-study, incarcerated
 */
export const NodeType = z.enum(['education', 'role', 'status']);
export type NodeType = z.infer<typeof NodeType>;

export const TaxonomySource = z.enum([
  'ipeds',
  'cip',
  'onet',
  'curated',
  'user-submitted',
]);
export type TaxonomySource = z.infer<typeof TaxonomySource>;

export const TaxonomyNode = z.object({
  /** Stable slug, e.g. "electrical-engineering". */
  id: z.string().min(1),
  kind: NodeKind,
  type: NodeType,
  label: z.string().min(1),
  /** Lowercased alternate spellings, abbreviations, and former names. */
  synonyms: z.array(z.string()).default([]),
  source: TaxonomySource,
  /** External identifier from the source dataset (CIP code, UNITID, SOC code). */
  sourceRef: z.string().optional(),
  /**
   * False for user-submitted nodes awaiting review. Provisional nodes are
   * searchable but are excluded from facet counts so a typo never becomes a
   * facet with a count of 1.
   */
  canonical: z.boolean().default(false),
  /** Set when an admin merges this node into another; reads redirect. */
  mergedInto: z.string().optional(),
});
export type TaxonomyNode = z.infer<typeof TaxonomyNode>;

/** A transition endpoint as stored on a pathway. */
export const Node = z.object({
  type: NodeType,
  label: z.string().min(1),
  /** Resolved taxonomy node id. Null while a provisional node awaits merge. */
  normalizedId: z.string().nullable(),
});
export type Node = z.infer<typeof Node>;

export const TRANSITION_TYPES = [
  'major-switch',
  'field-switch',
  'institution-jump',
  'industry-entry',
  'grad-school',
  'non-traditional-entry',
  'geographic',
  'career-restart',
] as const;

export const TransitionType = z.enum(TRANSITION_TYPES);
export type TransitionType = z.infer<typeof TransitionType>;

export const transitionTypeLabel: Record<TransitionType, string> = {
  'major-switch': 'Major switch',
  'field-switch': 'Field switch',
  'institution-jump': 'Institution jump',
  'industry-entry': 'Industry entry',
  'grad-school': 'Graduate school',
  'non-traditional-entry': 'Non-traditional entry',
  geographic: 'Geographic move',
  'career-restart': 'Career restart',
};

/**
 * Self-declared background tags.
 *
 * These are NEVER inferred. Nothing in this codebase may derive a demographic
 * attribute from a name, institution, photo, or writing style, and no model is
 * trained to guess them. Each tag is optional and independently hideable from
 * the public view.
 */
export const BACKGROUND_TAGS = [
  'first-generation',
  'international-student',
  'transfer-student',
  'veteran',
  'career-changer',
  'parent-caregiver',
  'disabled',
  'low-income',
  'rural',
  'returning-student',
  'self-taught',
  'immigrant',
] as const;

export const BackgroundTag = z.enum(BACKGROUND_TAGS);
export type BackgroundTag = z.infer<typeof BackgroundTag>;

/**
 * Honest starting conditions. These are what make a pathway relatable or not,
 * and they are the most commonly sanitized part of any success story — so they
 * are a first-class field rather than buried in prose.
 */
export const CONSTRAINTS = [
  'financial-need',
  'visa-status',
  'first-generation',
  'caregiving',
  'late-start',
  'low-gpa',
  'no-network',
  'health',
  'no-relevant-experience',
  'non-target-school',
  'language-barrier',
  'working-through-school',
] as const;

export const Constraint = z.enum(CONSTRAINTS);
export type Constraint = z.infer<typeof Constraint>;

export const constraintLabel: Record<Constraint, string> = {
  'financial-need': 'Financial need',
  'visa-status': 'Visa constraints',
  'first-generation': 'First-generation student',
  caregiving: 'Caregiving responsibilities',
  'late-start': 'Started late',
  'low-gpa': 'Low GPA',
  'no-network': 'No professional network',
  health: 'Health condition',
  'no-relevant-experience': 'No relevant experience',
  'non-target-school': 'Non-target school',
  'language-barrier': 'Language barrier',
  'working-through-school': 'Working through school',
};

export const backgroundTagLabel: Record<BackgroundTag, string> = {
  'first-generation': 'First-generation',
  'international-student': 'International student',
  'transfer-student': 'Transfer student',
  veteran: 'Veteran',
  'career-changer': 'Career changer',
  'parent-caregiver': 'Parent / caregiver',
  disabled: 'Disabled',
  'low-income': 'Low income',
  rural: 'Rural',
  'returning-student': 'Returning student',
  'self-taught': 'Self-taught',
  immigrant: 'Immigrant',
};
