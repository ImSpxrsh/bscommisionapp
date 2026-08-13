/**
 * Filter state and its URL encoding.
 *
 * The URL is the single source of truth for filter state on web, and the same
 * encoding backs mobile deep links. Both platforms call these functions, so a
 * link shared from web opens the identical result set on mobile — that property
 * is a checklist item, and it only holds because the codec lives here rather
 * than in either app.
 */

import { z } from 'zod';
import {
  BACKGROUND_TAGS,
  CONSTRAINTS,
  TRANSITION_TYPES,
  VERIFICATION_TIERS,
} from '@precedent/core';

export const SORT_MODES = ['relevance', 'recent', 'shortest', 'verification'] as const;
export const SortMode = z.enum(SORT_MODES);
export type SortMode = z.infer<typeof SortMode>;

export const sortModeLabel: Record<SortMode, string> = {
  relevance: 'Relevance',
  recent: 'Most recent',
  shortest: 'Shortest duration',
  verification: 'Highest verification',
};

export const SearchFilters = z.object({
  /** Transition endpoints — the primary axis of the product. */
  from: z.string().optional(),
  to: z.string().optional(),
  /** Free-text query, used when the user hasn't picked endpoints. */
  q: z.string().optional(),

  institution: z.array(z.string()).default([]),
  major: z.array(z.string()).default([]),
  industry: z.array(z.string()).default([]),
  location: z.array(z.string()).default([]),
  transitionType: z.array(z.enum(TRANSITION_TYPES)).default([]),
  verificationTier: z.array(z.enum(VERIFICATION_TIERS)).default([]),
  backgroundTag: z.array(z.enum(BACKGROUND_TAGS)).default([]),
  constraint: z.array(z.enum(CONSTRAINTS)).default([]),

  gradYearMin: z.number().int().optional(),
  gradYearMax: z.number().int().optional(),

  contactableOnly: z.boolean().default(false),
  hasObstaclesDocumented: z.boolean().default(false),

  sort: SortMode.default('relevance'),
  page: z.number().int().min(1).default(1),
});

export type SearchFilters = z.infer<typeof SearchFilters>;

export const EMPTY_FILTERS: SearchFilters = SearchFilters.parse({});

/** Multi-value facet keys, encoded as repeated params. */
const ARRAY_KEYS = [
  'institution',
  'major',
  'industry',
  'location',
  'transitionType',
  'verificationTier',
  'backgroundTag',
  'constraint',
] as const satisfies readonly (keyof SearchFilters)[];

const SCALAR_KEYS = ['from', 'to', 'q'] as const;
const BOOL_KEYS = ['contactableOnly', 'hasObstaclesDocumented'] as const;

/**
 * Encodes filters into URLSearchParams.
 *
 * Defaults are OMITTED so a URL stays readable and two equivalent filter states
 * always produce byte-identical URLs — which is what makes them cacheable and
 * comparable.
 */
export function filtersToSearchParams(filters: SearchFilters): URLSearchParams {
  const params = new URLSearchParams();

  for (const key of SCALAR_KEYS) {
    const value = filters[key];
    if (value) params.set(key, value);
  }
  for (const key of ARRAY_KEYS) {
    for (const value of filters[key] as string[]) params.append(key, value);
  }
  for (const key of BOOL_KEYS) {
    if (filters[key]) params.set(key, '1');
  }
  if (filters.gradYearMin !== undefined) params.set('gradYearMin', String(filters.gradYearMin));
  if (filters.gradYearMax !== undefined) params.set('gradYearMax', String(filters.gradYearMax));
  if (filters.sort !== 'relevance') params.set('sort', filters.sort);
  if (filters.page > 1) params.set('page', String(filters.page));

  return params;
}

export function filtersToQueryString(filters: SearchFilters): string {
  const qs = filtersToSearchParams(filters).toString();
  return qs ? `?${qs}` : '';
}

/**
 * Parses filters from URL params. Unknown or malformed values are DROPPED
 * rather than throwing — a hand-edited or truncated shared link should degrade
 * to a broader search, never to an error page.
 */
export function filtersFromSearchParams(
  input: URLSearchParams | Record<string, string | string[] | undefined>,
): SearchFilters {
  const params =
    input instanceof URLSearchParams ? input : recordToSearchParams(input);

  const raw: Record<string, unknown> = {};

  for (const key of SCALAR_KEYS) {
    const value = params.get(key);
    if (value) raw[key] = value;
  }
  for (const key of ARRAY_KEYS) {
    const values = params.getAll(key).filter(Boolean);
    if (values.length > 0) raw[key] = values;
  }
  for (const key of BOOL_KEYS) {
    raw[key] = params.get(key) === '1';
  }

  const min = Number(params.get('gradYearMin'));
  if (Number.isInteger(min) && min > 1900) raw.gradYearMin = min;
  const max = Number(params.get('gradYearMax'));
  if (Number.isInteger(max) && max > 1900) raw.gradYearMax = max;

  const sort = params.get('sort');
  if (sort && (SORT_MODES as readonly string[]).includes(sort)) raw.sort = sort;

  const page = Number(params.get('page'));
  if (Number.isInteger(page) && page > 0) raw.page = page;

  // Drop anything that failed validation rather than rejecting the whole URL.
  const result = SearchFilters.safeParse(raw);
  if (result.success) return result.data;

  const cleaned = { ...raw };
  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string') delete cleaned[key];
  }
  return SearchFilters.parse(cleaned);
}

function recordToSearchParams(
  record: Record<string, string | string[] | undefined>,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(record)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) for (const v of value) params.append(key, v);
    else params.append(key, value);
  }
  return params;
}

/** True when nothing but defaults is set — drives the "start searching" state. */
export function isEmptyFilterState(filters: SearchFilters): boolean {
  return filtersToSearchParams(filters).toString() === '';
}

/** Count of user-applied constraints, shown on the mobile filter button. */
export function activeFilterCount(filters: SearchFilters): number {
  let count = 0;
  for (const key of ARRAY_KEYS) count += (filters[key] as string[]).length;
  for (const key of BOOL_KEYS) if (filters[key]) count += 1;
  if (filters.gradYearMin !== undefined || filters.gradYearMax !== undefined) count += 1;
  return count;
}

/** An applied filter rendered as a removable chip above the results. */
export type FilterChip = {
  key: keyof SearchFilters;
  value: string;
  label: string;
};

export function removeChip(filters: SearchFilters, chip: FilterChip): SearchFilters {
  const next = { ...filters, page: 1 };
  const current = next[chip.key];
  if (Array.isArray(current)) {
    return { ...next, [chip.key]: current.filter((v) => v !== chip.value) };
  }
  if (typeof current === 'boolean') return { ...next, [chip.key]: false };
  return { ...next, [chip.key]: undefined };
}
