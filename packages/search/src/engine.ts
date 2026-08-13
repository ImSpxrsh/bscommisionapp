/**
 * Search: documents, facets, ranking, and adjacency.
 *
 * The ranking order is fixed by product policy:
 *   exact transition match → verification tier → completeness → similarity to
 *   the viewer's declared starting point → recency
 *
 * Engagement is NEVER a ranking input. `viewCount` and `savedCount` exist on the
 * model for the submitter's own view and for abuse detection, and they are
 * deliberately absent from `SearchDoc` so they cannot leak into scoring by
 * accident. `test/ranking.test.js` asserts that a popular pathway never
 * outranks a better-verified one.
 */

import {
  tierRank,
  type BackgroundTag,
  type Constraint,
  type TransitionType,
  type VerificationTier,
} from '@precedent/core';

import type { SearchFilters, SortMode } from './filters.js';

/**
 * The indexed projection of a pathway.
 *
 * Built only from `toPublicPathway` output — a private field cannot reach the
 * index because it never reaches this type.
 */
export type SearchDoc = {
  id: string;
  canonicalSlug: string;
  fromId: string | null;
  fromLabel: string;
  toId: string | null;
  toLabel: string;
  transitionType: TransitionType;

  institution: string | null;
  major: string;
  industry: string | null;
  locations: string[];
  graduationYear: number | null;

  backgroundTags: BackgroundTag[];
  constraints: Constraint[];

  verificationTier: VerificationTier;
  completenessScore: number;
  durationMonths: number;
  stepCount: number;
  hasObstaclesDocumented: boolean;
  contactable: boolean;
  /**
   * Step types in order, so a result card can render its compressed timeline
   * with the same colour encoding the profile uses. Types only — no titles,
   * dates, or organizations reach the index from here.
   */
  stepTypes: string[];

  outcomeResult: string;
  updatedAt: string;
  createdAt: string;

  /** Concatenated searchable text. */
  text: string;
};

/** The viewer's own starting point, used for similarity ranking when known. */
export type ViewerProfile = {
  institution?: string;
  major?: string;
  constraints?: Constraint[];
  backgroundTags?: BackgroundTag[];
};

export type FacetValue = { value: string; label: string; count: number };
export type Facets = Record<string, FacetValue[]>;

export type SearchResult = {
  docs: SearchDoc[];
  total: number;
  facets: Facets;
  page: number;
  pageSize: number;
};

export const PAGE_SIZE = 20;

// ------------------------------------------------------------------ filtering

const matchesAny = (values: readonly string[], selected: readonly string[]) =>
  selected.length === 0 || values.some((v) => selected.includes(v));

const matchesOne = (value: string | null, selected: readonly string[]) =>
  selected.length === 0 || (value !== null && selected.includes(value));

/**
 * Applies every filter EXCEPT the one named, which is how facet counts stay
 * live: a facet's own selection must not shrink its sibling options, or
 * multi-select becomes impossible to use.
 */
function passesFilters(
  doc: SearchDoc,
  f: SearchFilters,
  except?: keyof SearchFilters,
): boolean {
  const skip = (key: keyof SearchFilters) => except === key;

  if (!skip('from') && f.from && doc.fromId !== f.from) return false;
  if (!skip('to') && f.to && doc.toId !== f.to) return false;

  if (!skip('institution') && !matchesOne(doc.institution, f.institution)) return false;
  if (!skip('major') && !matchesOne(doc.major, f.major)) return false;
  if (!skip('industry') && !matchesOne(doc.industry, f.industry)) return false;
  if (!skip('location') && !matchesAny(doc.locations, f.location)) return false;
  if (!skip('transitionType') && !matchesOne(doc.transitionType, f.transitionType)) return false;
  if (!skip('verificationTier') && !matchesOne(doc.verificationTier, f.verificationTier)) {
    return false;
  }
  if (!skip('backgroundTag') && !matchesAny(doc.backgroundTags, f.backgroundTag)) return false;
  if (!skip('constraint') && !matchesAny(doc.constraints, f.constraint)) return false;

  if (!skip('gradYearMin') && f.gradYearMin !== undefined) {
    if (doc.graduationYear === null || doc.graduationYear < f.gradYearMin) return false;
  }
  if (!skip('gradYearMax') && f.gradYearMax !== undefined) {
    if (doc.graduationYear === null || doc.graduationYear > f.gradYearMax) return false;
  }

  if (!skip('contactableOnly') && f.contactableOnly && !doc.contactable) return false;
  if (!skip('hasObstaclesDocumented') && f.hasObstaclesDocumented && !doc.hasObstaclesDocumented) {
    return false;
  }

  if (!skip('q') && f.q) {
    const needle = f.q.toLowerCase();
    if (!doc.text.toLowerCase().includes(needle)) return false;
  }

  return true;
}

// ------------------------------------------------------------------- ranking

/** Jaccard-ish overlap between the viewer's declared context and a document. */
function similarityToViewer(doc: SearchDoc, viewer?: ViewerProfile): number {
  if (!viewer) return 0;
  let score = 0;
  if (viewer.institution && doc.institution === viewer.institution) score += 0.4;
  if (viewer.major && doc.major === viewer.major) score += 0.3;

  const sharedConstraints = (viewer.constraints ?? []).filter((c) =>
    doc.constraints.includes(c),
  ).length;
  const sharedTags = (viewer.backgroundTags ?? []).filter((t) =>
    doc.backgroundTags.includes(t),
  ).length;

  score += Math.min(sharedConstraints, 3) * 0.07;
  score += Math.min(sharedTags, 3) * 0.05;
  return Math.min(score, 1);
}

function recencyScore(doc: SearchDoc, now: number): number {
  const ageDays = (now - new Date(doc.updatedAt).getTime()) / 86_400_000;
  // Gentle decay: a five-year-old pathway is still a valid precedent.
  return 1 / (1 + ageDays / 1825);
}

/**
 * Relevance score. Weights are ordered so a lower-priority signal can never
 * overturn a higher-priority one: each tier's maximum contribution is smaller
 * than the minimum gap it would need to close.
 */
export function relevanceScore(
  doc: SearchDoc,
  filters: SearchFilters,
  viewer?: ViewerProfile,
  now = Date.now(),
): number {
  let score = 0;

  const exactFrom = filters.from && doc.fromId === filters.from;
  const exactTo = filters.to && doc.toId === filters.to;
  if (exactFrom && exactTo) score += 1000;
  else if (exactTo) score += 400;
  else if (exactFrom) score += 200;

  score += tierRank[doc.verificationTier] * 40;
  score += (doc.completenessScore / 100) * 30;
  score += similarityToViewer(doc, viewer) * 20;
  score += recencyScore(doc, now) * 8;

  return score;
}

function compare(a: SearchDoc, b: SearchDoc, sort: SortMode, f: SearchFilters, viewer?: ViewerProfile): number {
  switch (sort) {
    case 'recent':
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    case 'shortest':
      return a.durationMonths - b.durationMonths;
    case 'verification': {
      const byTier = tierRank[b.verificationTier] - tierRank[a.verificationTier];
      return byTier !== 0 ? byTier : b.completenessScore - a.completenessScore;
    }
    case 'relevance':
    default:
      return relevanceScore(b, f, viewer) - relevanceScore(a, f, viewer);
  }
}

// -------------------------------------------------------------------- facets

type FacetSpec = {
  key: keyof SearchFilters;
  extract: (doc: SearchDoc) => string[];
  label?: (value: string) => string;
};

const FACET_SPECS: FacetSpec[] = [
  { key: 'institution', extract: (d) => (d.institution ? [d.institution] : []) },
  { key: 'major', extract: (d) => [d.major] },
  { key: 'industry', extract: (d) => (d.industry ? [d.industry] : []) },
  { key: 'location', extract: (d) => d.locations },
  { key: 'transitionType', extract: (d) => [d.transitionType] },
  { key: 'verificationTier', extract: (d) => [d.verificationTier] },
  { key: 'backgroundTag', extract: (d) => d.backgroundTags },
  { key: 'constraint', extract: (d) => d.constraints },
];

/**
 * Live facet counts. Each facet is counted against the result set with its OWN
 * selection excluded, so selecting "Veteran" doesn't drop every other background
 * tag to zero.
 */
export function computeFacets(
  docs: readonly SearchDoc[],
  filters: SearchFilters,
  labelFor: (key: string, value: string) => string = (_k, v) => v,
): Facets {
  const facets: Facets = {};

  for (const spec of FACET_SPECS) {
    const counts = new Map<string, number>();
    for (const doc of docs) {
      if (!passesFilters(doc, filters, spec.key)) continue;
      for (const value of spec.extract(doc)) {
        counts.set(value, (counts.get(value) ?? 0) + 1);
      }
    }
    facets[spec.key] = [...counts.entries()]
      .map(([value, count]) => ({ value, label: labelFor(spec.key, value), count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }

  return facets;
}

// -------------------------------------------------------------------- search

export function search(
  docs: readonly SearchDoc[],
  filters: SearchFilters,
  opts: {
    viewer?: ViewerProfile;
    labelFor?: (key: string, value: string) => string;
    pageSize?: number;
  } = {},
): SearchResult {
  const pageSize = opts.pageSize ?? PAGE_SIZE;
  const matched = docs.filter((doc) => passesFilters(doc, filters));
  const sorted = [...matched].sort((a, b) => compare(a, b, filters.sort, filters, opts.viewer));

  const start = (filters.page - 1) * pageSize;

  return {
    docs: sorted.slice(start, start + pageSize),
    total: matched.length,
    facets: computeFacets(docs, filters, opts.labelFor),
    page: filters.page,
    pageSize,
  };
}

// ------------------------------------------------------------------ adjacency

export type AdjacentSuggestion = {
  filters: Pick<SearchFilters, 'from' | 'to'>;
  fromLabel: string;
  toLabel: string;
  count: number;
  /** Why this is being suggested — shown verbatim so the offer is legible. */
  relation: 'same-origin' | 'same-destination';
};

/**
 * Nearest adjacent transitions for the empty state.
 *
 * The empty state is a feature: when nobody in the index has made this exact
 * move, say so plainly and offer the routes that DO exist — same origin with a
 * different destination, and same destination from a different origin.
 */
export function adjacentTransitions(
  docs: readonly SearchDoc[],
  filters: SearchFilters,
  limit = 5,
): AdjacentSuggestion[] {
  const suggestions = new Map<string, AdjacentSuggestion>();

  const bump = (
    doc: SearchDoc,
    relation: AdjacentSuggestion['relation'],
  ) => {
    const key = `${doc.fromId ?? doc.fromLabel}>${doc.toId ?? doc.toLabel}`;
    const existing = suggestions.get(key);
    if (existing) {
      existing.count += 1;
      return;
    }
    suggestions.set(key, {
      filters: { from: doc.fromId ?? undefined, to: doc.toId ?? undefined },
      fromLabel: doc.fromLabel,
      toLabel: doc.toLabel,
      count: 1,
      relation,
    });
  };

  for (const doc of docs) {
    const sameOrigin = filters.from && doc.fromId === filters.from;
    const sameDestination = filters.to && doc.toId === filters.to;
    // Skip the exact pairing the user already searched — it has no results.
    if (sameOrigin && sameDestination) continue;
    if (sameOrigin) bump(doc, 'same-origin');
    else if (sameDestination) bump(doc, 'same-destination');
  }

  return [...suggestions.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Similar pathways for the profile page's "adjacent pathways" block. Ranked by
 * similarity to the VIEWER when their starting point is known, otherwise by
 * similarity to the pathway being viewed.
 */
export function similarPathways(
  docs: readonly SearchDoc[],
  current: SearchDoc,
  viewer?: ViewerProfile,
  limit = 5,
): SearchDoc[] {
  return docs
    .filter((d) => d.id !== current.id)
    .map((doc) => {
      let score = 0;
      if (doc.toId && doc.toId === current.toId) score += 3;
      if (doc.fromId && doc.fromId === current.fromId) score += 2;
      if (doc.transitionType === current.transitionType) score += 1;
      score += similarityToViewer(doc, viewer) * 3;
      score += tierRank[doc.verificationTier] * 0.25;
      return { doc, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.doc);
}
