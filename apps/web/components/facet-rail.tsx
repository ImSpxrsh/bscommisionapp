'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useTransition } from 'react';
import { X } from 'lucide-react';
import {
  activeFilterCount,
  filtersFromSearchParams,
  filtersToQueryString,
  type Facets,
  type SearchFilters,
} from '@precedent/search';

/**
 * Faceted filtering.
 *
 * The URL is the single source of truth: every interaction rewrites the query
 * string and the server re-renders. That is what makes a filtered view
 * shareable, back-button-correct, and identical when opened on mobile.
 *
 * Each facet group is a real <fieldset> with a <legend>, so a screen reader
 * announces "Verification, group" before the options; counts are part of each
 * label so they are announced rather than being colour/position-only.
 */

const GROUP_LABELS: Record<string, string> = {
  verificationTier: 'Verification',
  transitionType: 'Transition type',
  constraint: 'Starting constraints',
  backgroundTag: 'Background',
  major: 'Major',
  institution: 'Institution',
  location: 'Location',
  industry: 'Destination organization',
};

const GROUP_ORDER = [
  'verificationTier',
  'transitionType',
  'constraint',
  'backgroundTag',
  'major',
  'institution',
  'location',
] as const;

export function FacetRail({ facets, filters }: { facets: Facets; filters: SearchFilters }) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const apply = useCallback(
    (next: SearchFilters) => {
      startTransition(() => {
        router.push(`/search${filtersToQueryString({ ...next, page: 1 })}`, { scroll: false });
      });
    },
    [router],
  );

  const toggle = useCallback(
    (key: keyof SearchFilters, value: string) => {
      const current = filtersFromSearchParams(new URLSearchParams(params.toString()));
      const list = (current[key] as string[]) ?? [];
      const nextList = list.includes(value)
        ? list.filter((v) => v !== value)
        : [...list, value];
      apply({ ...current, [key]: nextList } as SearchFilters);
    },
    [apply, params],
  );

  const toggleBool = useCallback(
    (key: 'contactableOnly' | 'hasObstaclesDocumented') => {
      const current = filtersFromSearchParams(new URLSearchParams(params.toString()));
      apply({ ...current, [key]: !current[key] });
    },
    [apply, params],
  );

  const clearAll = useCallback(() => {
    startTransition(() => router.push('/search', { scroll: false }));
  }, [router]);

  const count = activeFilterCount(filters);

  return (
    <aside
      aria-label="Filters"
      className={`text-sm transition-opacity duration-fast ${isPending ? 'opacity-60' : ''}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-caps text-ink-muted">
          Filters
        </h2>
        {count > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="cursor-pointer rounded-sm text-xs font-medium text-accent transition-colors duration-fast hover:text-accent-hover"
          >
            Clear all ({count})
          </button>
        )}
      </div>

      <fieldset className="mb-5 border-0 p-0">
        <legend className="mb-1.5 text-xs font-semibold text-ink-secondary">
          Availability
        </legend>
        <label className="flex cursor-pointer items-center gap-2 py-1">
          <input
            type="checkbox"
            checked={filters.contactableOnly}
            onChange={() => toggleBool('contactableOnly')}
            className="h-3.5 w-3.5 cursor-pointer accent-[var(--color-accent)]"
          />
          <span className="text-ink-secondary">Open to contact</span>
        </label>
        <label className="flex cursor-pointer items-center gap-2 py-1">
          <input
            type="checkbox"
            checked={filters.hasObstaclesDocumented}
            onChange={() => toggleBool('hasObstaclesDocumented')}
            className="h-3.5 w-3.5 cursor-pointer accent-[var(--color-accent)]"
          />
          <span className="text-ink-secondary">Obstacles documented</span>
        </label>
      </fieldset>

      {GROUP_ORDER.map((key) => {
        const values = facets[key];
        if (!values || values.length === 0) return null;
        const selected = (filters[key] as string[]) ?? [];

        return (
          <fieldset key={key} className="mb-5 border-0 p-0">
            <legend className="mb-1.5 text-xs font-semibold text-ink-secondary">
              {GROUP_LABELS[key] ?? key}
            </legend>
            <div className="space-y-0.5">
              {values.slice(0, 8).map((facet) => (
                <label
                  key={facet.value}
                  className="flex cursor-pointer items-center gap-2 rounded-sm py-1 pr-1 transition-colors duration-fast hover:bg-surface-hover"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(facet.value)}
                    onChange={() => toggle(key, facet.value)}
                    className="h-3.5 w-3.5 shrink-0 cursor-pointer accent-[var(--color-accent)]"
                  />
                  <span className="flex-1 truncate text-ink-secondary">{facet.label}</span>
                  {/* Count is inside the label so it is announced with the option. */}
                  <span className="tnum shrink-0 text-2xs text-ink-muted">{facet.count}</span>
                </label>
              ))}
            </div>
          </fieldset>
        );
      })}
    </aside>
  );
}

/** Applied filters as removable chips above the results. */
export function FilterChips({ filters, facets }: { filters: SearchFilters; facets: Facets }) {
  const router = useRouter();

  const chips: Array<{ key: keyof SearchFilters; value: string; label: string }> = [];

  for (const key of GROUP_ORDER) {
    for (const value of (filters[key] as string[]) ?? []) {
      const label =
        facets[key]?.find((f) => f.value === value)?.label ?? value;
      chips.push({ key, value, label });
    }
  }
  if (filters.contactableOnly) {
    chips.push({ key: 'contactableOnly', value: '1', label: 'Open to contact' });
  }
  if (filters.hasObstaclesDocumented) {
    chips.push({ key: 'hasObstaclesDocumented', value: '1', label: 'Obstacles documented' });
  }

  if (chips.length === 0) return null;

  const remove = (chip: (typeof chips)[number]) => {
    const next = { ...filters, page: 1 };
    const current = next[chip.key];
    if (Array.isArray(current)) {
      (next[chip.key] as unknown) = current.filter((v) => v !== chip.value);
    } else {
      (next[chip.key] as unknown) = false;
    }
    router.push(`/search${filtersToQueryString(next)}`, { scroll: false });
  };

  return (
    <ul className="mb-3 flex flex-wrap gap-1.5" aria-label="Applied filters">
      {chips.map((chip) => (
        <li key={`${chip.key}:${chip.value}`}>
          <button
            type="button"
            onClick={() => remove(chip)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-sm border border-border bg-surface px-2 py-1 text-xs transition-colors duration-fast hover:bg-surface-hover"
          >
            {chip.label}
            <X size={11} aria-hidden="true" />
            <span className="sr-only">Remove filter</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
