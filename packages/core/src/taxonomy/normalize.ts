/**
 * Taxonomy resolution.
 *
 * Resolution order, most to least confident:
 *   1. exact id match
 *   2. exact label match (case/punctuation-insensitive)
 *   3. registered synonym
 *   4. token-set match — handles "Electrical & Computer Engineering" vs
 *      "Electrical and Computer Engineering"
 *   5. edit-distance match, gated to close spellings only
 *
 * Anything unresolved returns a PROVISIONAL result rather than an error. The
 * submitter is never blocked; the merge queue reconciles it later.
 */

import { slugify } from '../primitives.js';
import type { NodeKind, TaxonomyNode } from './types.js';

/** Strips punctuation and expands the handful of ampersand-style variants. */
export function canonicalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[./]/g, ' ')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Words that carry no distinguishing signal in institution/major names. */
const STOP_WORDS = new Set([
  'the', 'of', 'and', 'at', 'in', 'a', 'university', 'college', 'school',
  'institute', 'program', 'department', 'studies', 'major',
]);

function tokenSet(input: string): Set<string> {
  return new Set(
    canonicalizeText(input)
      .split(/[\s-]+/)
      .filter((t) => t.length > 1 && !STOP_WORDS.has(t)),
  );
}

/** Jaccard overlap of significant tokens. */
function tokenSimilarity(a: string, b: string): number {
  const sa = tokenSet(a);
  const sb = tokenSet(b);
  if (sa.size === 0 || sb.size === 0) return 0;
  let shared = 0;
  for (const t of sa) if (sb.has(t)) shared += 1;
  return shared / (sa.size + sb.size - shared);
}

/** Levenshtein distance, iterative two-row. */
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const row = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j - 1]! + 1, prev[j]! + 1, prev[j - 1]! + cost);
    }
    prev = row;
  }
  return prev[b.length]!;
}

export type ResolutionMethod =
  | 'id'
  | 'label'
  | 'synonym'
  | 'token-set'
  | 'edit-distance'
  | 'provisional';

export type Resolution = {
  node: TaxonomyNode;
  method: ResolutionMethod;
  confidence: number;
  /** True when this is a new provisional node needing admin review. */
  needsReview: boolean;
};

/** Follows `mergedInto` pointers so a merged node always resolves to its target. */
export function followMerges(
  node: TaxonomyNode,
  index: ReadonlyMap<string, TaxonomyNode>,
  depth = 0,
): TaxonomyNode {
  if (!node.mergedInto || depth > 8) return node;
  const target = index.get(node.mergedInto);
  return target ? followMerges(target, index, depth + 1) : node;
}

export type TaxonomyIndex = {
  byId: ReadonlyMap<string, TaxonomyNode>;
  /** canonicalized label/synonym → node id */
  byText: ReadonlyMap<string, string>;
};

export function buildIndex(nodes: readonly TaxonomyNode[]): TaxonomyIndex {
  const byId = new Map<string, TaxonomyNode>();
  const byText = new Map<string, string>();
  for (const node of nodes) {
    byId.set(node.id, node);
    byText.set(`${node.kind}:${canonicalizeText(node.label)}`, node.id);
    for (const syn of node.synonyms) {
      byText.set(`${node.kind}:${canonicalizeText(syn)}`, node.id);
    }
  }
  return { byId, byText };
}

const TOKEN_MATCH_FLOOR = 0.72;
/** Edit distance is only trusted for near-identical strings — typos, not guesses. */
const EDIT_DISTANCE_MAX_RATIO = 0.18;

/**
 * Resolves free text to a canonical node.
 *
 * Always succeeds. When nothing matches it mints a provisional node so the
 * submission flow never dead-ends on a missing institution.
 */
export function resolveNode(
  input: string,
  kind: NodeKind,
  index: TaxonomyIndex,
  nodes: readonly TaxonomyNode[],
): Resolution {
  const raw = input.trim();
  const text = canonicalizeText(raw);

  const direct = index.byId.get(slugify(raw));
  if (direct && direct.kind === kind) {
    return { node: followMerges(direct, index.byId), method: 'id', confidence: 1, needsReview: false };
  }

  const byText = index.byText.get(`${kind}:${text}`);
  if (byText) {
    const node = index.byId.get(byText)!;
    const resolved = followMerges(node, index.byId);
    const method: ResolutionMethod =
      canonicalizeText(node.label) === text ? 'label' : 'synonym';
    return { node: resolved, method, confidence: 0.98, needsReview: false };
  }

  const candidates = nodes.filter((n) => n.kind === kind && !n.mergedInto);

  let best: { node: TaxonomyNode; score: number } | null = null;
  for (const node of candidates) {
    const score = tokenSimilarity(raw, node.label);
    if (!best || score > best.score) best = { node, score };
  }
  if (best && best.score >= TOKEN_MATCH_FLOOR) {
    return {
      node: followMerges(best.node, index.byId),
      method: 'token-set',
      confidence: best.score,
      needsReview: best.score < 0.85,
    };
  }

  let closest: { node: TaxonomyNode; distance: number } | null = null;
  for (const node of candidates) {
    const distance = editDistance(text, canonicalizeText(node.label));
    if (!closest || distance < closest.distance) closest = { node, distance };
  }
  if (closest && closest.distance <= Math.ceil(text.length * EDIT_DISTANCE_MAX_RATIO)) {
    return {
      node: followMerges(closest.node, index.byId),
      method: 'edit-distance',
      confidence: 1 - closest.distance / Math.max(text.length, 1),
      needsReview: true,
    };
  }

  return {
    node: {
      id: `provisional-${kind}-${slugify(raw)}`,
      kind,
      type: kindToType(kind),
      label: raw,
      synonyms: [],
      source: 'user-submitted',
      canonical: false,
    },
    method: 'provisional',
    confidence: 0,
    needsReview: true,
  };
}

export function kindToType(kind: NodeKind): 'education' | 'role' | 'status' {
  switch (kind) {
    case 'institution':
    case 'major':
      return 'education';
    case 'role':
      return 'role';
    case 'status':
      return 'status';
    default: {
      const exhaustive: never = kind;
      throw new Error(`Unhandled node kind: ${String(exhaustive)}`);
    }
  }
}

/**
 * Canonical slug for a transition, e.g.
 * "electrical-engineering-to-dental-school". This is the shareable identity of
 * a pathway *class* and must be derived identically on every platform.
 */
export function transitionSlug(fromLabel: string, toLabel: string): string {
  return `${slugify(fromLabel)}-to-${slugify(toLabel)}`;
}
