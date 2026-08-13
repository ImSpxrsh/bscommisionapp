'use client';

import { useEffect, useRef, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { activeFilterCount, type Facets, type SearchFilters } from '@precedent/search';

import { FacetRail } from './facet-rail';

/**
 * Filters below the `lg` breakpoint.
 *
 * The desktop facet rail is hidden under 1024px, so without this there is no way
 * to filter on a phone or tablet. Built on a native <dialog> so focus trapping,
 * Escape-to-close, and the inert background come from the platform rather than
 * from hand-rolled key handling that usually gets one of them wrong.
 *
 * The trigger is a 44pt-tall control, meeting the minimum touch target.
 */
export function MobileFilterSheet({
  facets,
  filters,
}: {
  facets: Facets;
  filters: SearchFilters;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const count = activeFilterCount(filters);

  // Close the sheet once a filter navigation completes, so the user sees the
  // results they just asked for rather than the sheet they left open.
  useEffect(() => {
    if (open) close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const show = () => {
    dialogRef.current?.showModal();
    setOpen(true);
  };

  const close = () => {
    dialogRef.current?.close();
    setOpen(false);
  };

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={show}
        className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors duration-fast hover:bg-surface-hover"
      >
        <SlidersHorizontal size={15} aria-hidden="true" />
        Filters
        {count > 0 && (
          <span
            className="tnum rounded-full px-1.5 py-0.5 text-2xs font-semibold"
            style={{ background: 'var(--color-accent)', color: 'var(--color-ink-on-accent)' }}
          >
            {count}
          </span>
        )}
      </button>

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        aria-label="Filters"
        className="m-0 max-h-[85vh] w-full max-w-none rounded-t-xl border border-border bg-surface p-0 text-ink backdrop:bg-black/40 open:fixed open:bottom-0 open:left-0 open:right-0 open:top-auto"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-surface px-4 py-3">
          <h2 className="text-md font-semibold">Filters</h2>
          <button
            type="button"
            onClick={close}
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-md transition-colors duration-fast hover:bg-surface-hover"
          >
            <X size={18} aria-hidden="true" />
            <span className="sr-only">Close filters</span>
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-4">
          <FacetRail facets={facets} filters={filters} />
        </div>

        <div className="sticky bottom-0 border-t border-border bg-surface px-4 py-3">
          <button
            type="button"
            onClick={close}
            className="h-11 w-full cursor-pointer rounded-md text-sm font-medium transition-colors duration-fast"
            style={{ background: 'var(--color-accent)', color: 'var(--color-ink-on-accent)' }}
          >
            Show results
          </button>
        </div>
      </dialog>
    </div>
  );
}
