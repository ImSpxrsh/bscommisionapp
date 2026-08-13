/**
 * Precedent API.
 *
 * Built on node:http so the service runs with no framework install and no
 * infrastructure — `npm run api` works immediately. Routes are pure functions of
 * (store, params), which keeps them testable without a listening socket.
 *
 * Every pathway leaves this service through `toPublicPathway`. The response
 * guard in `send()` re-checks that, so a route that forgets to redact fails
 * loudly instead of leaking.
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

import {
  Pathway,
  backgroundTagLabel,
  constraintLabel,
  privateValuesOf,
  transitionTypeLabel,
  tierRank,
  toPublicPathway,
  type VerificationTier,
} from '@precedent/core';
import {
  adjacentTransitions,
  filtersFromSearchParams,
  parseQuery,
  search,
  similarPathways,
  type SearchFilters,
} from '@precedent/search';

import { MemoryStore, buildProfilePayload } from './store.js';

const store = new MemoryStore();

/** Facet values render with human labels; the label map lives with the domain. */
function labelFor(key: string, value: string): string {
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

type Json = Record<string, unknown> | unknown[];

function send(res: ServerResponse, status: number, body: Json): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(payload);
}

/**
 * Defence in depth: the type system already prevents indexing private data, but
 * a response is the last place a leak can happen, so it is checked at runtime
 * too. Cheap, and it catches a field added later that forgot to redact.
 */
function sendPathway(res: ServerResponse, status: number, body: Json, sourceIds: string[]): void {
  const serialized = JSON.stringify(body);
  for (const id of sourceIds) {
    const full = store.getPathway(id);
    if (!full) continue;
    for (const secret of privateValuesOf(full)) {
      if (serialized.includes(secret)) {
        // Never ship the leak. Fail the request instead.
        send(res, 500, {
          error: 'response_guard_tripped',
          message: 'A private field reached a response body and the request was aborted.',
        });
        return;
      }
    }
  }
  send(res, status, body);
}

// --------------------------------------------------------------------- routes

function handleSearch(url: URL, res: ServerResponse): void {
  const filters: SearchFilters = filtersFromSearchParams(url.searchParams);
  const docs = store.listDocs();
  const result = search(docs, filters, { labelFor });

  const body: Json = {
    filters,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    results: result.docs,
    facets: result.facets,
    // The empty state is a feature: offer the nearest routes that do exist.
    adjacent: result.total === 0 ? adjacentTransitions(docs, filters) : [],
  };
  send(res, 200, body);
}

function handleParse(url: URL, res: ServerResponse): void {
  const q = url.searchParams.get('q') ?? '';
  const parsed = parseQuery(q, store.getTaxonomy());
  // The interpretation is always returned so the UI can show editable chips.
  send(res, 200, {
    query: q,
    filters: parsed.filters,
    interpretation: parsed.tokens,
    unmatched: parsed.unmatched,
  });
}

function handleProfile(id: string, res: ServerResponse): void {
  const pathway = store.getPathway(id);
  if (!pathway) {
    const receipt = store.getReceipt(id);
    send(res, 410, {
      error: 'gone',
      message: receipt
        ? 'This pathway was deleted by its author.'
        : 'No such pathway.',
    });
    return;
  }

  const payload = buildProfilePayload(pathway);
  const docs = store.listDocs();
  const current = docs.find((d) => d.id === id);

  sendPathway(
    res,
    200,
    {
      ...payload,
      similar: current ? similarPathways(docs, current) : [],
    },
    [id],
  );
}

function handleCompare(url: URL, res: ServerResponse): void {
  const ids = (url.searchParams.get('ids') ?? '').split(',').filter(Boolean).slice(0, 3);
  const pathways = ids
    .map((id) => store.getPathway(id))
    .filter((p): p is NonNullable<typeof p> => p !== undefined);

  if (pathways.length < 2) {
    send(res, 400, {
      error: 'insufficient_pathways',
      message: 'Comparison needs at least two pathways.',
    });
    return;
  }

  sendPathway(
    res,
    200,
    {
      pathways: pathways.map((p) => buildProfilePayload(p)),
    },
    ids,
  );
}

function handleTaxonomy(url: URL, res: ServerResponse): void {
  const q = (url.searchParams.get('q') ?? '').toLowerCase();
  const kind = url.searchParams.get('kind');

  const nodes = store
    .getTaxonomy()
    .filter((n) => !n.mergedInto)
    .filter((n) => (kind ? n.kind === kind : true))
    .filter(
      (n) =>
        !q ||
        n.label.toLowerCase().includes(q) ||
        n.synonyms.some((s) => s.toLowerCase().includes(q)),
    )
    .slice(0, 20)
    .map((n) => ({ id: n.id, label: n.label, kind: n.kind, type: n.type, canonical: n.canonical }));

  send(res, 200, { nodes });
}

function handleExport(id: string, res: ServerResponse): void {
  // A submitter's own export includes their private fields — it is their data.
  const pathway = store.exportPathway(id);
  if (!pathway) {
    send(res, 404, { error: 'not_found' });
    return;
  }
  send(res, 200, pathway as unknown as Json);
}

function handleDelete(id: string, res: ServerResponse): void {
  const receipt = store.deletePathway(id);
  if (!receipt) {
    send(res, 404, { error: 'not_found' });
    return;
  }
  send(res, 200, {
    deleted: true,
    receipt,
    message:
      'The pathway was removed from the database, the search index, and caches, and no longer appears in similar-pathway results.',
  });
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return null;
  }
}

async function handleSubmit(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = await readBody(req);
  if (body === null) {
    send(res, 400, { error: 'invalid_json' });
    return;
  }

  const parsed = Pathway.safeParse(body);
  if (!parsed.success) {
    send(res, 422, {
      error: 'validation_failed',
      issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })),
    });
    return;
  }

  const stored = store.upsertPathway(parsed.data);
  sendPathway(res, 201, { id: stored.id, pathway: toPublicPathway(stored) }, [stored.id]);
}

/**
 * Moderation queue, risk-ranked for a single part-time reviewer: reported and
 * unverified-but-detailed items surface first, since those are where fabricated
 * content does the most damage.
 */
function handleAdminQueue(res: ServerResponse): void {
  const docs = store.listDocs();
  const items = docs
    .map((doc) => {
      const pathway = store.getPathway(doc.id)!;
      let risk = 0;
      risk += pathway.meta.reportCount * 100;
      if (tierRank[doc.verificationTier as VerificationTier] === 0) risk += 40;
      if (doc.completenessScore > 70 && tierRank[doc.verificationTier as VerificationTier] === 0) {
        // High detail with no verification is the fabrication signature.
        risk += 30;
      }
      if (!doc.hasObstaclesDocumented) risk += 10;
      return {
        id: doc.id,
        transition: `${doc.fromLabel} → ${doc.toLabel}`,
        tier: doc.verificationTier,
        completeness: doc.completenessScore,
        reports: pathway.meta.reportCount,
        risk,
      };
    })
    .filter((i) => i.risk > 0)
    .sort((a, b) => b.risk - a.risk)
    .slice(0, 50);

  send(res, 200, { items, reviewerModel: 'single part-time reviewer' });
}

// -------------------------------------------------------------------- routing

export function createApiServer() {
  return createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    res.setHeader('access-control-allow-origin', '*');
    res.setHeader('access-control-allow-headers', 'content-type');
    res.setHeader('access-control-allow-methods', 'GET,POST,DELETE,OPTIONS');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      if (path === '/' || path === '/health') {
        send(res, 200, { ok: true, ...store.stats() });
        return;
      }
      if (path === '/search' && req.method === 'GET') return handleSearch(url, res);
      if (path === '/parse' && req.method === 'GET') return handleParse(url, res);
      if (path === '/taxonomy' && req.method === 'GET') return handleTaxonomy(url, res);
      if (path === '/compare' && req.method === 'GET') return handleCompare(url, res);
      if (path === '/pathways' && req.method === 'POST') return handleSubmit(req, res);
      if (path === '/admin/queue' && req.method === 'GET') return handleAdminQueue(res);

      const profile = path.match(/^\/pathways\/([^/]+)$/);
      if (profile) {
        const id = decodeURIComponent(profile[1]!);
        if (req.method === 'GET') return handleProfile(id, res);
        if (req.method === 'DELETE') return handleDelete(id, res);
      }

      const exportMatch = path.match(/^\/pathways\/([^/]+)\/export$/);
      if (exportMatch && req.method === 'GET') {
        return handleExport(decodeURIComponent(exportMatch[1]!), res);
      }

      send(res, 404, { error: 'not_found', path });
    } catch (error) {
      send(res, 500, {
        error: 'internal_error',
        message: error instanceof Error ? error.message : 'unknown',
      });
    }
  });
}

export { store };

// Started directly (not imported by a test).
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop() ?? '')) {
  const port = Number(process.env.PORT ?? 4000);
  createApiServer().listen(port, () => {
    const s = store.stats();
    console.log(
      `Precedent API on http://localhost:${port} — ${s.pathways} pathways across ${s.transitions} transitions, ${s.taxonomyNodes} taxonomy nodes`,
    );
  });
}
