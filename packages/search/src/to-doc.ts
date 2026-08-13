/**
 * Pathway → SearchDoc.
 *
 * This is the ONLY way a pathway enters the index, and it takes a
 * `PublicPathway` rather than a `Pathway` — the type system makes it impossible
 * to index unredacted data. Anonymity and field-level visibility are therefore
 * enforced before indexing, not after retrieval, so a private field cannot leak
 * through a facet value or a search hit.
 */

import {
  completenessScore,
  pathwayDuration,
  toPublicPathway,
  type Pathway,
  type PublicPathway,
} from '@precedent/core';

import type { SearchDoc } from './engine.js';

export function publicPathwayToDoc(
  pathway: PublicPathway,
  extra: { completenessScore: number; durationMonths: number },
): SearchDoc {
  const hasObstacles = pathway.steps.some(
    (s) => s.obstacle !== undefined || s.type === 'setback',
  );

  // Searchable text is assembled from public fields only.
  const text = [
    pathway.transition.from.label,
    pathway.transition.to.label,
    pathway.startingPoint.major,
    pathway.startingPoint.institution,
    pathway.outcome.result,
    pathway.outcome.organization,
    ...pathway.steps.map((s) => `${s.title} ${s.organization ?? ''}`),
  ]
    .filter(Boolean)
    .join(' ');

  return {
    id: pathway.id,
    canonicalSlug: pathway.transition.canonicalSlug,
    fromId: pathway.transition.from.normalizedId,
    fromLabel: pathway.transition.from.label,
    toId: pathway.transition.to.normalizedId,
    toLabel: pathway.transition.to.label,
    transitionType: pathway.transition.transitionType,

    institution: pathway.startingPoint.institution ?? null,
    major: pathway.startingPoint.major,
    industry: pathway.outcome.organization ?? null,
    locations: pathway.person.locations ?? [],
    graduationYear: pathway.person.graduationYear
      ? Number(pathway.person.graduationYear.slice(0, 4))
      : null,

    backgroundTags: (pathway.person.backgroundTags ?? []) as SearchDoc['backgroundTags'],
    constraints: pathway.startingPoint.constraints as SearchDoc['constraints'],

    verificationTier: pathway.verification.tier,
    completenessScore: extra.completenessScore,
    durationMonths: extra.durationMonths,
    stepCount: pathway.steps.length,
    hasObstaclesDocumented: hasObstacles,
    contactable: pathway.contact.isOpen && pathway.contact.mode === 'relay',
    stepTypes: pathway.steps.map((s) => s.type),

    outcomeResult: pathway.outcome.result,
    updatedAt: pathway.meta.updatedAt,
    createdAt: pathway.meta.createdAt,

    text,
  };
}

/** Convenience: redact then index, so a caller cannot skip the redaction step. */
export function pathwayToDoc(pathway: Pathway): SearchDoc {
  return publicPathwayToDoc(toPublicPathway(pathway), {
    completenessScore: completenessScore(pathway).score,
    durationMonths: pathwayDuration(pathway),
  });
}
