'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ArrowRight, Search, Sparkles, X } from 'lucide-react';
import type { TaxonomyNode } from '@precedent/core';
import { EMPTY_FILTERS, filtersToQueryString, parseQuery } from '@precedent/search';

/**
 * The pathway search bar.
 *
 * Two linked comboboxes carry the from → to mental model, with a
 * natural-language fallback underneath. The parse is ALWAYS displayed as
 * editable chips before anything is searched — the user sees exactly how their
 * sentence was interpreted and can remove any part of it. Nothing is silently
 * rewritten.
 */

type Option = { id: string; label: string };

function Combobox({
  id,
  label,
  placeholder,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (id: string) => void;
  options: Option[];
}) {
  const [query, setQuery] = useState('');
  const selected = options.find((o) => o.id === value);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 8);
    return options.filter((o) => o.label.toLowerCase().includes(q)).slice(0, 8);
  }, [options, query]);

  return (
    <div className="flex-1">
      <label htmlFor={id} className="mb-1 block text-2xs font-semibold uppercase tracking-caps text-ink-muted">
        {label}
      </label>
      {selected ? (
        <div className="flex h-10 items-center gap-2 rounded-md border border-border-strong bg-surface px-3">
          <span className="flex-1 truncate text-sm font-medium">{selected.label}</span>
          <button
            type="button"
            onClick={() => {
              onChange('');
              setQuery('');
            }}
            className="cursor-pointer rounded-sm text-ink-muted transition-colors duration-fast hover:text-ink"
          >
            <X size={14} aria-hidden="true" />
            <span className="sr-only">Clear {label}</span>
          </button>
        </div>
      ) : (
        <>
          <input
            id={id}
            type="text"
            role="combobox"
            aria-expanded={matches.length > 0 && query.length > 0}
            aria-controls={`${id}-listbox`}
            aria-autocomplete="list"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm transition-colors duration-fast focus:border-border-strong"
          />
          {query.length > 0 && matches.length > 0 && (
            <ul
              id={`${id}-listbox`}
              role="listbox"
              className="mt-1 max-h-56 overflow-auto rounded-md border border-border bg-surface-elevated shadow-md"
            >
              {matches.map((option) => (
                <li key={option.id} role="option" aria-selected={false}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(option.id);
                      setQuery('');
                    }}
                    className="w-full cursor-pointer px-3 py-2 text-left text-sm transition-colors duration-fast hover:bg-surface-hover"
                  >
                    {option.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

export function PathwaySearchBar({
  nodes,
  initialFrom = '',
  initialTo = '',
}: {
  nodes: Array<Pick<TaxonomyNode, 'id' | 'label' | 'kind' | 'synonyms' | 'type' | 'source' | 'canonical'>>;
  initialFrom?: string;
  initialTo?: string;
}) {
  const router = useRouter();
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [sentence, setSentence] = useState('');

  const options = useMemo(
    () => nodes.map((n) => ({ id: n.id, label: n.label })),
    [nodes],
  );

  // The parse runs live so the interpretation is visible BEFORE the user
  // commits to a search.
  const parsed = useMemo(
    () => (sentence.trim() ? parseQuery(sentence, nodes as TaxonomyNode[]) : null),
    [sentence, nodes],
  );

  const submit = () => {
    if (parsed && (parsed.filters.from || parsed.filters.to)) {
      router.push(`/search${filtersToQueryString(parsed.filters)}`);
      return;
    }
    router.push(
      `/search${filtersToQueryString({
        ...EMPTY_FILTERS,
        from: from || undefined,
        to: to || undefined,
        q: sentence.trim() || undefined,
      })}`,
    );
  };

  return (
    <div className="card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Combobox
          id="from-node"
          label="From"
          placeholder="e.g. Electrical Engineering"
          value={from}
          onChange={setFrom}
          options={options}
        />
        <ArrowRight
          size={16}
          aria-hidden="true"
          className="hidden shrink-0 self-center text-ink-muted sm:block sm:pb-2.5"
        />
        <Combobox
          id="to-node"
          label="To"
          placeholder="e.g. Dental School"
          value={to}
          onChange={setTo}
          options={options}
        />
        <button
          type="button"
          onClick={submit}
          className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-colors duration-fast"
          style={{ background: 'var(--color-accent)', color: 'var(--color-ink-on-accent)' }}
        >
          <Search size={15} aria-hidden="true" />
          Search
        </button>
      </div>

      <div className="mt-3 border-t border-border pt-3">
        <label htmlFor="nl-query" className="mb-1 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-caps text-ink-muted">
          <Sparkles size={11} aria-hidden="true" />
          Or describe it
        </label>
        <input
          id="nl-query"
          type="text"
          value={sentence}
          onChange={(e) => setSentence(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="I'm an EE major who wants to do dentistry"
          className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm transition-colors duration-fast focus:border-border-strong"
        />

        {parsed && (parsed.tokens.length > 0 || parsed.unmatched) && (
          <div className="mt-2" aria-live="polite">
            <p className="mb-1.5 text-2xs text-ink-muted">
              Interpreted as — remove anything that is wrong:
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {parsed.tokens.map((token) => (
                <li
                  key={`${token.field}:${token.value}`}
                  className="inline-flex items-center gap-1 rounded-sm border px-2 py-1 text-xs"
                  style={{
                    borderColor: 'var(--color-accent)',
                    background: 'var(--color-accent-subtle)',
                  }}
                >
                  <span className="text-ink-muted">{token.field}:</span>
                  <span className="font-medium">{token.label}</span>
                </li>
              ))}
              {parsed.unmatched && (
                <li className="inline-flex items-center rounded-sm border border-border px-2 py-1 text-xs text-ink-muted">
                  not understood: “{parsed.unmatched}”
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
