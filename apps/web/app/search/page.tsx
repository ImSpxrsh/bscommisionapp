import Link from 'next/link';
import { ArrowRight, SearchX } from 'lucide-react';
import { filtersFromSearchParams, filtersToQueryString, sortModeLabel, SORT_MODES } from '@precedent/search';

import { FacetRail, FilterChips } from '@/components/facet-rail';
import { MobileFilterSheet } from '@/components/mobile-filter-sheet';
import { ResultCard } from '@/components/result-card';
import { SequenceLegend } from '@/components/sequence-ribbon';
import { runSearch } from '@/lib/data';

export const dynamic = 'force-dynamic';

/**
 * Results.
 *
 * Filter state comes entirely from the URL — this page has no local state, so a
 * shared link and a back-button press produce identical output.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = filtersFromSearchParams(params);
  const result = runSearch(filters);

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <div className="mx-auto max-w-[1120px] px-4 py-6">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* The rail stays put while results scroll — filtering is a bulk-scanning
            activity, and losing the facet counts off the top of the page is what
            makes a filter set feel unnavigable. */}
        <div className="hidden lg:block">
          <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto pr-1">
            <FacetRail facets={result.facets} filters={filters} />
          </div>
        </div>

        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold">
                <span className="tnum">{result.total}</span>{' '}
                {result.total === 1 ? 'pathway' : 'pathways'}
              </h1>
              {/* Below `lg` the facet rail is hidden; this is how filtering
                  stays reachable on a phone or tablet. */}
              <MobileFilterSheet facets={result.facets} filters={filters} />
            </div>

            <form className="flex items-center gap-2 text-sm">
              <label htmlFor="sort" className="text-ink-muted">
                Sort
              </label>
              <select
                id="sort"
                name="sort"
                defaultValue={filters.sort}
                className="cursor-pointer rounded-md border border-border bg-surface px-2 py-1 text-sm"
              >
                {SORT_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {sortModeLabel[mode]}
                  </option>
                ))}
              </select>
              {/* Preserve the rest of the filter state when sorting. */}
              {Object.entries(params).map(([key, value]) =>
                key === 'sort' || value === undefined ? null : (
                  Array.isArray(value) ? (
                    value.map((v, i) => <input key={`${key}${i}`} type="hidden" name={key} value={v} />)
                  ) : (
                    <input key={key} type="hidden" name={key} value={value} />
                  )
                ),
              )}
              <button
                type="submit"
                className="cursor-pointer rounded-md border border-border px-2 py-1 text-xs transition-colors duration-fast hover:bg-surface-hover"
              >
                Apply
              </button>
            </form>
          </div>

          <FilterChips filters={filters} facets={result.facets} />

          {result.total > 0 ? (
            <>
              <SequenceLegend className="mb-3 border-b border-border pb-3" />

              <ul className="space-y-2">
                {result.docs.map((doc) => (
                  <ResultCard key={doc.id} doc={doc} />
                ))}
              </ul>

              {totalPages > 1 && (
                <nav
                  aria-label="Pagination"
                  className="mt-6 flex items-center justify-between border-t border-border pt-4 text-sm"
                >
                  {filters.page > 1 ? (
                    <Link
                      href={`/search${filtersToQueryString({ ...filters, page: filters.page - 1 })}`}
                      className="cursor-pointer rounded-md border border-border px-3 py-1.5 transition-colors duration-fast hover:bg-surface-hover"
                    >
                      Previous
                    </Link>
                  ) : (
                    <span />
                  )}
                  <span className="tnum text-ink-muted">
                    Page {filters.page} of {totalPages}
                  </span>
                  {filters.page < totalPages ? (
                    <Link
                      href={`/search${filtersToQueryString({ ...filters, page: filters.page + 1 })}`}
                      className="cursor-pointer rounded-md border border-border px-3 py-1.5 transition-colors duration-fast hover:bg-surface-hover"
                    >
                      Next
                    </Link>
                  ) : (
                    <span />
                  )}
                </nav>
              )}
            </>
          ) : (
            <EmptyState adjacent={result.adjacent} />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * The empty state is a feature, not an apology.
 *
 * It states plainly that nobody in the index has made this exact move, then
 * offers the adjacent routes that DO exist, plus a way to be told when one
 * appears.
 */
function EmptyState({
  adjacent,
}: {
  adjacent: Array<{
    filters: { from?: string; to?: string };
    fromLabel: string;
    toLabel: string;
    count: number;
    relation: 'same-origin' | 'same-destination';
  }>;
}) {
  const sameOrigin = adjacent.filter((a) => a.relation === 'same-origin');
  const sameDestination = adjacent.filter((a) => a.relation === 'same-destination');

  return (
    <div className="card px-5 py-6">
      <div className="flex items-start gap-3">
        <SearchX size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-ink-muted" />
        <div>
          <h2 className="text-md font-semibold">
            No one in the index has made this exact move yet.
          </h2>
          <p className="mt-1 text-sm text-ink-secondary">
            That is a gap in the data, not a verdict on the transition. Here is what
            is adjacent to it.
          </p>
        </div>
      </div>

      {sameOrigin.length > 0 && (
        <AdjacentGroup title="Others who started where you are" items={sameOrigin} />
      )}
      {sameDestination.length > 0 && (
        <AdjacentGroup title="Others who arrived where you want to be" items={sameDestination} />
      )}

      <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
        <button
          type="button"
          className="cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-fast"
          style={{ background: 'var(--color-accent)', color: 'var(--color-ink-on-accent)' }}
        >
          Alert me when someone adds this
        </button>
        <Link
          href="/submit"
          className="cursor-pointer rounded-md border border-border px-3 py-1.5 text-sm font-medium transition-colors duration-fast hover:bg-surface-hover"
        >
          Invite someone who has done it
        </Link>
      </div>
    </div>
  );
}

function AdjacentGroup({
  title,
  items,
}: {
  title: string;
  items: Array<{
    filters: { from?: string; to?: string };
    fromLabel: string;
    toLabel: string;
    count: number;
  }>;
}) {
  return (
    <section className="mt-5">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-caps text-ink-muted">
        {title}
      </h3>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={`${item.fromLabel}-${item.toLabel}`}>
            <Link
              href={`/search?${new URLSearchParams(
                Object.entries(item.filters).filter(([, v]) => v) as [string, string][],
              ).toString()}`}
              className="card card-interactive flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2"
            >
              <span className="text-sm font-medium">{item.fromLabel}</span>
              <ArrowRight size={13} aria-hidden="true" className="text-ink-muted" />
              <span className="text-sm font-medium">{item.toLabel}</span>
              <span className="tnum ml-auto text-xs text-ink-muted">
                {item.count} {item.count === 1 ? 'pathway' : 'pathways'}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
