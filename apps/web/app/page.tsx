import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { PathwaySearchBar } from '@/components/pathway-search-bar';
import { SequenceLegend, SequenceRibbon } from '@/components/sequence-ribbon';
import { TierBadge } from '@/components/tier-badge';
import { getExamplePathways, getStats, getTaxonomy } from '@/lib/data';
import { formatDuration } from '@precedent/core';

export default function HomePage() {
  const nodes = getTaxonomy();
  const examples = getExamplePathways();
  const stats = getStats();

  return (
    <div className="mx-auto max-w-[840px] px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Has someone already done what you are trying to do?
      </h1>
      <p className="mt-3 max-w-[60ch] text-md text-ink-secondary">
        Precedent indexes real transitions and the exact sequence of steps each
        person took — including the parts that did not work.
      </p>

      <div className="mt-6">
        <PathwaySearchBar nodes={nodes} />
      </div>

      {/* Real pathways from the index, not marketing copy. */}
      <section className="mt-10" aria-labelledby="examples-heading">
        <h2
          id="examples-heading"
          className="mb-3 text-xs font-semibold uppercase tracking-caps text-ink-muted"
        >
          In the index right now
        </h2>
        <ul className="space-y-1.5">
          {examples.map((doc) => (
            <li key={doc.id}>
              <Link
                href={`/p/${doc.id}`}
                className="card card-interactive block px-3 py-2.5"
              >
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-sm font-semibold">{doc.fromLabel}</span>
                  <ArrowRight size={13} aria-hidden="true" className="text-ink-muted" />
                  <span className="text-sm font-semibold">{doc.toLabel}</span>
                  <TierBadge tier={doc.verificationTier} />
                  <span className="tnum ml-auto text-xs text-ink-muted">
                    {formatDuration(doc.durationMonths)} · {doc.stepCount} steps
                  </span>
                </div>
                <SequenceRibbon
                  stepTypes={doc.stepTypes}
                  stepCount={doc.stepCount}
                  className="mt-2"
                />
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <SequenceLegend />
          <p className="tnum text-xs text-ink-muted">
            {stats.pathways} pathways across {stats.transitions} transitions.
          </p>
        </div>
      </section>

      <section className="mt-10 border-t border-border pt-6" aria-labelledby="how-heading">
        <h2 id="how-heading" className="text-sm font-semibold">
          What makes this different from asking on a forum
        </h2>
        <ul className="mt-2 space-y-1.5 text-sm text-ink-secondary">
          <li>
            Every pathway is a structured timeline, so two routes to the same
            destination can be compared step by step.
          </li>
          <li>
            Setbacks and rejections are first-class entries. A pathway with no
            friction recorded is marked incomplete, not clean.
          </li>
          <li>
            Verification says exactly what was checked and when — never a single
            opaque checkmark.
          </li>
          <li>
            No feed, no likes, no notifications. Search, read, save, leave.
          </li>
        </ul>
      </section>
    </div>
  );
}
