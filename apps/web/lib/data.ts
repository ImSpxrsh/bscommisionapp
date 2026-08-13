import 'server-only';

import {
  backgroundTagLabel,
  constraintLabel,
  transitionTypeLabel,
} from '@precedent/core';
import {
  adjacentTransitions,
  search,
  similarPathways,
  type SearchFilters,
} from '@precedent/search';
import { MemoryStore, buildProfilePayload } from '@precedent/api/dist/store.js';

/**
 * Data access seam.
 *
 * Server components read through this module. In development it talks to the
 * in-process seeded store, so the app runs with no database and no search
 * server; in production the same functions front the HTTP API. Either way the
 * ranking and facet logic is the shared implementation in `@precedent/search`,
 * so results cannot differ between environments.
 *
 * Everything returned here is already redacted — the store hands back
 * `toPublicPathway` output — so a page cannot accidentally render a private
 * field.
 */

const store = new MemoryStore();

export function facetLabel(key: string, value: string): string {
  switch (key) {
    case 'transitionType':
      return transitionTypeLabel[value as keyof typeof transitionTypeLabel] ?? value;
    case 'backgroundTag':
      return backgroundTagLabel[value as keyof typeof backgroundTagLabel] ?? value;
    case 'constraint':
      return constraintLabel[value as keyof typeof constraintLabel] ?? value;
    case 'verificationTier':
      return value.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
    default:
      return value;
  }
}

export function runSearch(filters: SearchFilters) {
  const docs = store.listDocs();
  const result = search(docs, filters, { labelFor: facetLabel });
  return {
    ...result,
    adjacent: result.total === 0 ? adjacentTransitions(docs, filters) : [],
  };
}

export function getProfile(id: string) {
  const pathway = store.getPathway(id);
  if (!pathway) return null;

  const docs = store.listDocs();
  const current = docs.find((d) => d.id === id);

  return {
    ...buildProfilePayload(pathway),
    similar: current ? similarPathways(docs, current) : [],
  };
}

export function getComparison(ids: string[]) {
  return ids
    .map((id) => store.getPathway(id))
    .filter((p): p is NonNullable<typeof p> => p !== undefined)
    .map((p) => buildProfilePayload(p));
}

export function getTaxonomy() {
  return store.getTaxonomy().filter((n) => !n.mergedInto);
}

/**
 * Real examples for the landing page, drawn from the index rather than written
 * as marketing copy. Picks the best-evidenced pathway per transition.
 */
export function getExamplePathways(limit = 6) {
  const seen = new Set<string>();
  return store
    .listDocs()
    .slice()
    .sort((a, b) => b.completenessScore - a.completenessScore)
    .filter((doc) => {
      if (seen.has(doc.canonicalSlug)) return false;
      seen.add(doc.canonicalSlug);
      return true;
    })
    .slice(0, limit);
}

export function getStats() {
  return store.stats();
}
