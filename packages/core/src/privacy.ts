/**
 * Field-level privacy and redaction.
 *
 * The dataset is other people's biographies, so redaction is enforced in shared
 * domain code rather than at each call site. `toPublicPathway` is the ONLY
 * sanctioned way to turn a stored pathway into something a viewer, a share card,
 * or the search index can see. If a surface serializes a raw `Pathway`, that is
 * a bug — `test/privacy.test.js` asserts the redacted output is free of private
 * values.
 *
 * Design notes:
 *  - Redaction DELETES rather than nulls. A key present with a null value still
 *    tells an observer the field exists and was withheld.
 *  - Pseudonymity survives verification: `realName` never appears in public
 *    output regardless of tier.
 *  - The search index consumes the same redacted object as the API, so a private
 *    field cannot leak through a facet or a search hit.
 */

import { z } from 'zod';
import { formatGraduationYear, formatLocation } from './primitives.js';
import type { Pathway } from './pathway.js';

/** Every field a submitter can independently control. */
export const CONTROLLED_FIELDS = [
  'displayName',
  'institution',
  'employer',
  'compensation',
  'location',
  'graduationYear',
  'backgroundTags',
  'gpaBand',
] as const;

export const ControlledField = z.enum(CONTROLLED_FIELDS);
export type ControlledField = z.infer<typeof ControlledField>;

export const FieldVisibility = z.enum(['public', 'private']);
export type FieldVisibility = z.infer<typeof FieldVisibility>;

export const VisibilitySettings = z.record(ControlledField, FieldVisibility);
export type VisibilitySettings = Partial<Record<ControlledField, FieldVisibility>>;

/**
 * Defaults chosen to be privacy-preserving where the field is identifying and
 * useful where it is not. Compensation defaults to private: it is the field
 * most likely to be shared without thinking through the consequences.
 */
export const DEFAULT_VISIBILITY: Record<ControlledField, FieldVisibility> = {
  displayName: 'public',
  institution: 'public',
  employer: 'public',
  compensation: 'private',
  location: 'public',
  graduationYear: 'public',
  backgroundTags: 'public',
  gpaBand: 'public',
};

export function isVisible(
  field: ControlledField,
  settings: VisibilitySettings | undefined,
): boolean {
  return (settings?.[field] ?? DEFAULT_VISIBILITY[field]) === 'public';
}

/**
 * The public projection of a pathway. Deliberately a distinct type from
 * `Pathway` so a function that accepts `PublicPathway` cannot be handed private
 * data by mistake — the type system carries the privacy boundary.
 */
export type PublicPathway = Omit<Pathway, 'person' | 'startingPoint' | 'outcome' | 'contact'> & {
  person: {
    /** Pseudonym when anonymous. `realName` is never present here. */
    displayName: string;
    isAnonymous: boolean;
    backgroundTags?: string[];
    graduationYear?: string;
    locations?: string[];
  };
  startingPoint: {
    institution?: string;
    major: string;
    gpaBand?: string;
    priorExperience?: string;
    constraints: string[];
  };
  outcome: {
    result: string;
    organization?: string;
    date: string;
    compensationBand?: string;
    isFinal: boolean;
  };
  contact: {
    isOpen: boolean;
    topics: string[];
    /** Relay-only. An address is never serialized under any circumstance. */
    mode: 'relay' | 'none';
  };
};

/**
 * Redacts a stored pathway down to what a viewer may see.
 *
 * Anonymity is applied first and unconditionally: when `isAnonymous` is set, the
 * pseudonym replaces the display name and the real name is dropped before any
 * other rule runs.
 */
export function toPublicPathway(pathway: Pathway): PublicPathway {
  const v = pathway.person.visibility;
  const anonymous = pathway.person.isAnonymous;

  const displayName = anonymous
    ? pathway.person.pseudonym
    : isVisible('displayName', v)
      ? pathway.person.displayName ?? pathway.person.pseudonym
      : pathway.person.pseudonym;

  const person: PublicPathway['person'] = {
    displayName,
    isAnonymous: anonymous,
  };

  if (isVisible('backgroundTags', v) && pathway.person.backgroundTags.length > 0) {
    person.backgroundTags = [...pathway.person.backgroundTags];
  }
  if (isVisible('graduationYear', v) && pathway.person.graduationYear) {
    person.graduationYear = formatGraduationYear(pathway.person.graduationYear);
  }
  if (isVisible('location', v) && pathway.person.locations.length > 0) {
    // Rendered at the submitter's chosen precision — a narrower precision is
    // dropped here, not merely hidden by the client.
    person.locations = pathway.person.locations.map(formatLocation);
  }

  const startingPoint: PublicPathway['startingPoint'] = {
    major: pathway.startingPoint.major,
    constraints: [...pathway.startingPoint.constraints],
  };
  if (isVisible('institution', v)) startingPoint.institution = pathway.startingPoint.institution;
  if (isVisible('gpaBand', v) && pathway.startingPoint.gpaBand) {
    startingPoint.gpaBand = pathway.startingPoint.gpaBand;
  }
  if (pathway.startingPoint.priorExperience) {
    startingPoint.priorExperience = pathway.startingPoint.priorExperience;
  }

  const outcome: PublicPathway['outcome'] = {
    result: pathway.outcome.result,
    date: pathway.outcome.date,
    isFinal: pathway.outcome.isFinal,
  };
  if (isVisible('employer', v) && pathway.outcome.organization) {
    outcome.organization = pathway.outcome.organization;
  }
  if (isVisible('compensation', v) && pathway.outcome.compensationBand) {
    outcome.compensationBand = pathway.outcome.compensationBand;
  }

  const { person: _p, startingPoint: _s, outcome: _o, contact: _c, ...rest } = pathway;

  return {
    ...rest,
    person,
    startingPoint,
    outcome,
    contact: {
      isOpen: pathway.contact.isOpen,
      mode: pathway.contact.mode,
      topics: [...pathway.contact.topics],
    },
    steps: pathway.steps.map((step) => ({
      ...step,
      organization:
        isVisible('employer', v) || step.type === 'coursework' ? step.organization : undefined,
    })),
  };
}

/**
 * Values that must never appear anywhere in public output. Used by the privacy
 * test and by the API's response guard as a defence-in-depth check — cheap, and
 * it catches a leak introduced by a future field that forgot to redact.
 */
export function privateValuesOf(pathway: Pathway): string[] {
  const out: string[] = [];
  const v = pathway.person.visibility;
  if (pathway.person.isAnonymous || !isVisible('displayName', v)) {
    if (pathway.person.displayName) out.push(pathway.person.displayName);
  }
  if (pathway.person.realName) out.push(pathway.person.realName);
  if (pathway.contact.relayAddress) out.push(pathway.contact.relayAddress);
  if (!isVisible('compensation', v) && pathway.outcome.compensationBand) {
    out.push(pathway.outcome.compensationBand);
  }
  if (!isVisible('employer', v) && pathway.outcome.organization) {
    out.push(pathway.outcome.organization);
  }
  if (!isVisible('gpaBand', v) && pathway.startingPoint.gpaBand) {
    out.push(pathway.startingPoint.gpaBand);
  }
  return out.filter((s): s is string => typeof s === 'string' && s.length > 0);
}
