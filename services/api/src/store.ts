/**
 * Data + index access.
 *
 * `PathwayStore` is the seam between the API and its persistence. Two
 * implementations ship:
 *
 *   - `MemoryStore` — seeded, zero-infrastructure, used for local dev, demos,
 *     and tests. `npm run api` works with no Postgres and no Meilisearch.
 *   - a Prisma + Meilisearch implementation for production, which satisfies the
 *     same interface (see prisma/schema.prisma).
 *
 * The routes only ever talk to this interface, so swapping the backend cannot
 * change behaviour — and the search/ranking logic they share lives in
 * `@precedent/search`, not here.
 *
 * The store holds FULL pathways including private fields. Redaction happens on
 * the way out, in the routes, via `toPublicPathway`. Nothing here may be
 * serialized to a client directly.
 */

import {
  completenessScore,
  deriveTier,
  pathwayDuration,
  toPublicPathway,
  type Pathway,
  type TaxonomyNode,
  SEED_TAXONOMY,
} from '@precedent/core';
import { pathwayToDoc, type SearchDoc } from '@precedent/search';

import { generateSeedPathways } from './seed/generate.js';

export type DeletionReceipt = {
  pathwayId: string;
  requestedAt: string;
  indexPurgedAt: string | null;
  cachePurgedAt: string | null;
  completedAt: string | null;
};

export interface PathwayStore {
  listDocs(): readonly SearchDoc[];
  getPathway(id: string): Pathway | undefined;
  getTaxonomy(): readonly TaxonomyNode[];
  upsertPathway(pathway: Pathway): Pathway;
  /** Real deletion: row, index, and caches. Returns the receipt. */
  deletePathway(id: string): DeletionReceipt | null;
  getReceipt(id: string): DeletionReceipt | undefined;
}

export class MemoryStore implements PathwayStore {
  #pathways = new Map<string, Pathway>();
  #docs = new Map<string, SearchDoc>();
  #taxonomy: TaxonomyNode[] = [...SEED_TAXONOMY];
  #receipts = new Map<string, DeletionReceipt>();
  /** Stands in for the CDN/response cache so purge propagation is observable. */
  #cache = new Map<string, unknown>();

  constructor(seed = true) {
    if (seed) {
      for (const pathway of generateSeedPathways()) this.upsertPathway(pathway);
    }
  }

  listDocs(): readonly SearchDoc[] {
    return [...this.#docs.values()];
  }

  getPathway(id: string): Pathway | undefined {
    return this.#pathways.get(id);
  }

  getTaxonomy(): readonly TaxonomyNode[] {
    return this.#taxonomy;
  }

  addTaxonomyNode(node: TaxonomyNode): void {
    this.#taxonomy.push(node);
  }

  upsertPathway(pathway: Pathway): Pathway {
    // The tier is always derived from the signals actually present, so it can
    // never be set to something the evidence does not support.
    const tier = deriveTier(pathway.verification.signals, {
      hasAttestation: pathway.verification.tier !== 'unverified',
    });
    const stored: Pathway = {
      ...pathway,
      verification: { ...pathway.verification, tier },
    };

    this.#pathways.set(stored.id, stored);
    this.#docs.set(stored.id, pathwayToDoc(stored));
    this.#cache.delete(stored.id);
    return stored;
  }

  /**
   * Deletion is real deletion. The row, the search document, and the cache entry
   * all go, and the pathway stops appearing in similar-pathway results because
   * those are computed from `listDocs()`.
   */
  deletePathway(id: string): DeletionReceipt | null {
    if (!this.#pathways.has(id)) return null;
    const now = new Date().toISOString();

    this.#pathways.delete(id);
    this.#docs.delete(id);
    this.#cache.delete(id);

    const receipt: DeletionReceipt = {
      pathwayId: id,
      requestedAt: now,
      indexPurgedAt: now,
      cachePurgedAt: now,
      completedAt: now,
    };
    this.#receipts.set(id, receipt);
    return receipt;
  }

  getReceipt(id: string): DeletionReceipt | undefined {
    return this.#receipts.get(id);
  }

  /** Full JSON export for the submitter. Their own data, including private fields. */
  exportPathway(id: string): Pathway | undefined {
    return this.#pathways.get(id);
  }

  stats() {
    const docs = this.listDocs();
    return {
      pathways: docs.length,
      transitions: new Set(docs.map((d) => d.canonicalSlug)).size,
      taxonomyNodes: this.#taxonomy.length,
    };
  }
}

/** Everything a profile page needs, redacted and enriched. */
export function buildProfilePayload(pathway: Pathway) {
  return {
    pathway: toPublicPathway(pathway),
    completeness: completenessScore(pathway),
    durationMonths: pathwayDuration(pathway),
  };
}
