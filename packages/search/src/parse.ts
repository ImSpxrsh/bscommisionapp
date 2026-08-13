/**
 * Natural-language query parsing.
 *
 * "I'm an EE major who wants to do dentistry" → structured filters.
 *
 * Two hard rules:
 *
 * 1. The parse is DETERMINISTIC and rule-based. No model rewrites a user's
 *    query, because a silent rewrite makes a result set unexplainable — the user
 *    cannot tell whether the index lacks results or the parser changed the
 *    question.
 * 2. The interpretation is ALWAYS returned alongside the filters, with the exact
 *    input span each token came from, so the UI can render it as editable chips.
 *    Anything not understood comes back in `unmatched` rather than being
 *    quietly dropped.
 */

import {
  buildIndex,
  resolveNode,
  type NodeKind,
  type TaxonomyNode,
  CONSTRAINTS,
  BACKGROUND_TAGS,
  constraintLabel,
  backgroundTagLabel,
} from '@precedent/core';

import { EMPTY_FILTERS, type SearchFilters } from './filters.js';

/** One thing the parser understood, traceable back to the user's words. */
export type ParseToken = {
  field: 'from' | 'to' | 'constraint' | 'backgroundTag' | 'transitionType';
  value: string;
  /** Human-readable, shown on the chip. */
  label: string;
  /** The exact substring this came from — lets the UI highlight the source. */
  sourceText: string;
  confidence: number;
};

export type ParsedQuery = {
  filters: SearchFilters;
  tokens: ParseToken[];
  /** Words the parser could not account for. Shown so nothing is silently lost. */
  unmatched: string;
};

/** Phrases that separate the origin from the destination. */
const SEPARATORS = [
  '->',
  '→',
  ' to ',
  ' into ',
  ' who wants to ',
  ' wanting to ',
  ' trying to ',
  ' switching to ',
  ' moving to ',
  ' transition to ',
  ' pivoting to ',
  ' then ',
];

const LEAD_INS = [
  /^i'?m an?\s+/i,
  /^i am an?\s+/i,
  /^i'?m\s+/i,
  /^as an?\s+/i,
  /^from\s+/i,
  /^a\s+/i,
  /^an\s+/i,
];

const TRAIL_NOISE = [
  /\s+major$/i,
  /\s+student$/i,
  /\s+degree$/i,
  /^do\s+/i,
  /^get into\s+/i,
  /^become an?\s+/i,
  /^work in\s+/i,
  /^a career in\s+/i,
  /\s+school$/i,
];

/** Keyword → constraint. Matched on word boundaries against the raw input. */
const CONSTRAINT_HINTS: Array<[RegExp, (typeof CONSTRAINTS)[number]]> = [
  [/\b(low|bad|poor)\s+gpa\b/i, 'low-gpa'],
  [/\bfirst[-\s]?gen(eration)?\b/i, 'first-generation'],
  [/\bno\s+(professional\s+)?network\b/i, 'no-network'],
  [/\bnon[-\s]?target\b/i, 'non-target-school'],
  [/\b(visa|international|f-?1|opt)\b/i, 'visa-status'],
  [/\b(broke|no money|financial(ly)?\s+(need|constrained)|can'?t afford)\b/i, 'financial-need'],
  [/\b(career\s+chang|late\s+start|starting\s+late|older)\b/i, 'late-start'],
  [/\b(caregiv|single\s+parent|kids)\b/i, 'caregiving'],
  [/\bworking\s+(through|while)\b/i, 'working-through-school'],
  [/\bno\s+(relevant\s+)?experience\b/i, 'no-relevant-experience'],
];

const BACKGROUND_HINTS: Array<[RegExp, (typeof BACKGROUND_TAGS)[number]]> = [
  [/\bveteran\b|\bmilitary\b/i, 'veteran'],
  [/\btransfer\s+student\b/i, 'transfer-student'],
  [/\binternational\s+student\b/i, 'international-student'],
  [/\bself[-\s]?taught\b|\bbootcamp\b/i, 'self-taught'],
  [/\bimmigrant\b/i, 'immigrant'],
  [/\bfirst[-\s]?gen(eration)?\b/i, 'first-generation'],
];

/**
 * Connectives left dangling once a hint phrase is removed. Extracting "low GPA"
 * from "…dental school with a low GPA" would otherwise leave "dental school
 * with a", which no longer resolves against the taxonomy.
 */
const DANGLING_CONNECTIVES =
  /[\s,]+(with|and|but|having|who|which|that|plus|as|from)?[\s,]*(an?|the)?[\s,]*$/i;

function stripAffixes(input: string): string {
  let out = input.trim();
  for (const re of LEAD_INS) out = out.replace(re, '');
  for (const re of TRAIL_NOISE) out = out.replace(re, '');
  out = out.replace(DANGLING_CONNECTIVES, '');
  return out.replace(/[.,!?]+$/, '').trim();
}

/** Splits on the first separator that appears outside the first two characters. */
function splitEndpoints(input: string): { left: string; right: string } | null {
  const lower = input.toLowerCase();
  let best: { index: number; length: number } | null = null;
  for (const sep of SEPARATORS) {
    const idx = lower.indexOf(sep);
    if (idx > 1 && (!best || idx < best.index)) best = { index: idx, length: sep.length };
  }
  if (!best) return null;
  return {
    left: input.slice(0, best.index).trim(),
    right: input.slice(best.index + best.length).trim(),
  };
}

/** Tries each node kind and keeps the most confident non-provisional match. */
function resolveEndpoint(
  text: string,
  nodes: readonly TaxonomyNode[],
  index: ReturnType<typeof buildIndex>,
): { id: string; label: string; confidence: number } | null {
  const cleaned = stripAffixes(text);
  if (!cleaned) return null;

  const kinds: NodeKind[] = ['major', 'role', 'institution', 'status'];
  let best: { id: string; label: string; confidence: number } | null = null;

  for (const kind of kinds) {
    const r = resolveNode(cleaned, kind, index, nodes);
    if (r.method === 'provisional') continue;
    if (!best || r.confidence > best.confidence) {
      best = { id: r.node.id, label: r.node.label, confidence: r.confidence };
    }
  }
  return best;
}

/**
 * Parses a natural-language query into filters plus a visible interpretation.
 *
 * Never throws and never returns empty-handed: unrecognized input is preserved
 * in `filters.q` so it can still drive a text search.
 */
export function parseQuery(
  input: string,
  nodes: readonly TaxonomyNode[],
): ParsedQuery {
  const index = buildIndex(nodes);
  const tokens: ParseToken[] = [];
  const filters: SearchFilters = { ...EMPTY_FILTERS };
  const consumed: string[] = [];

  const trimmed = input.trim();
  if (!trimmed) return { filters, tokens, unmatched: '' };

  for (const [re, constraint] of CONSTRAINT_HINTS) {
    const match = trimmed.match(re);
    if (match && !filters.constraint.includes(constraint)) {
      filters.constraint = [...filters.constraint, constraint];
      tokens.push({
        field: 'constraint',
        value: constraint,
        label: constraintLabel[constraint],
        sourceText: match[0],
        confidence: 0.9,
      });
      consumed.push(match[0]);
    }
  }

  for (const [re, tag] of BACKGROUND_HINTS) {
    const match = trimmed.match(re);
    if (match && !filters.backgroundTag.includes(tag)) {
      filters.backgroundTag = [...filters.backgroundTag, tag];
      tokens.push({
        field: 'backgroundTag',
        value: tag,
        label: backgroundTagLabel[tag],
        sourceText: match[0],
        confidence: 0.85,
      });
      consumed.push(match[0]);
    }
  }

  // Strip the hint phrases before looking for endpoints, so "low GPA" doesn't
  // get mistaken for part of a major name.
  let endpointText = trimmed;
  for (const phrase of consumed) {
    endpointText = endpointText.replace(phrase, ' ');
  }
  endpointText = endpointText.replace(/\s+/g, ' ').trim();

  const split = splitEndpoints(endpointText);
  if (split) {
    const from = resolveEndpoint(split.left, nodes, index);
    const to = resolveEndpoint(split.right, nodes, index);

    if (from) {
      filters.from = from.id;
      tokens.push({
        field: 'from',
        value: from.id,
        label: from.label,
        sourceText: split.left,
        confidence: from.confidence,
      });
    }
    if (to) {
      filters.to = to.id;
      tokens.push({
        field: 'to',
        value: to.id,
        label: to.label,
        sourceText: split.right,
        confidence: to.confidence,
      });
    }

    // Whatever the parser could not resolve stays visible as free text.
    const leftovers = [from ? '' : split.left, to ? '' : split.right]
      .filter(Boolean)
      .join(' ')
      .trim();
    if (leftovers) filters.q = leftovers;
    return { filters, tokens, unmatched: leftovers };
  }

  // No separator: treat the whole thing as a destination if it resolves,
  // otherwise as free text. Guessing a direction the user didn't state would be
  // exactly the kind of silent rewrite this parser exists to avoid.
  const single = resolveEndpoint(endpointText, nodes, index);
  if (single) {
    filters.to = single.id;
    tokens.push({
      field: 'to',
      value: single.id,
      label: single.label,
      sourceText: endpointText,
      confidence: single.confidence * 0.8,
    });
    return { filters, tokens, unmatched: '' };
  }

  filters.q = endpointText;
  return { filters, tokens, unmatched: endpointText };
}
