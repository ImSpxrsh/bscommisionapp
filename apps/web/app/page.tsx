import Link from 'next/link';
import { ArrowRight, Search, TrendingDown } from 'lucide-react';

import { PathwaySearchBar } from '@/components/pathway-search-bar';
import { SequenceLegend, SequenceRibbon } from '@/components/sequence-ribbon';
import { TierBadge } from '@/components/tier-badge';
import { getExamplePathways, getStats, getTaxonomy } from '@/lib/data';
import { formatDuration } from '@precedent/core';

/**
 * Landing page.
 *
 * The only marketing surface in the product, and the only place the display
 * type scale, the rounded display face, and the warm surface tokens are used.
 * Everything past the search bar is the tool, and the tool stays dense, cool,
 * and restrained. See design-system/OVERRIDES.md #11.
 *
 * The audience is a sixteen-year-old deciding whether this is for them, so the
 * page has to answer three questions above the fold — what is this, is it real,
 * and what do I do first — before it says anything else.
 */
/**
 * The hero's proof-of-concept: one real record, shown rather than described.
 *
 * Deliberately not a screenshot — it is the live component, so it cannot drift
 * from what the product actually renders.
 */
function FeaturedRoute({ doc }: { doc: ReturnType<typeof getExamplePathways>[number] }) {
  return (
    <Link
      href={`/p/${doc.id}`}
      className="card card-interactive block bg-landing-surface px-5 py-5 shadow-md"
    >
      <span className="text-2xs font-semibold uppercase tracking-caps text-ink-muted">
        One route in the index
      </span>

      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-lg font-bold leading-tight">{doc.fromLabel}</span>
        <ArrowRight size={17} aria-hidden="true" className="shrink-0 text-ink-muted" />
        <span className="text-lg font-bold leading-tight">{doc.toLabel}</span>
      </div>

      <SequenceRibbon
        stepTypes={doc.stepTypes}
        stepCount={doc.stepCount}
        className="mt-4"
      />

      <div className="tnum mt-2.5 flex flex-wrap items-center gap-x-3 text-xs text-ink-muted">
        <span className="font-medium text-ink-secondary">
          {formatDuration(doc.durationMonths)}
        </span>
        <span>{doc.stepCount} steps</span>
        {doc.hasObstaclesDocumented && <span>obstacles recorded</span>}
      </div>

      <p className="mt-4 border-t border-border pt-3.5 text-sm font-medium text-ink">
        {doc.outcomeResult}
      </p>

      <div className="mt-3 flex items-center justify-between gap-2">
        <TierBadge tier={doc.verificationTier} />
        <span className="text-xs font-semibold text-accent">
          See all {doc.stepCount} steps →
        </span>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const nodes = getTaxonomy();
  const [featured, ...examples] = getExamplePathways(7);
  const stats = getStats();

  return (
    <div className="bg-landing-bg">
      {/* ---------------------------------------------------------------- Hero */}
      <section className="mx-auto max-w-[1080px] px-5 pb-10 pt-14 sm:pt-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <h1 className="font-display text-4xl font-extrabold leading-none tracking-tighter sm:text-5xl">
              Someone already did what you&apos;re trying to do.
            </h1>

            <p className="mt-6 max-w-[44ch] text-lg text-ink-secondary sm:text-xl">
              See the exact steps they took to get there — how long each part
              took, and what went wrong on the way.
            </p>
          </div>

          {/* Show the artefact rather than describing it. A reader who does not
              yet know what a "pathway" is learns it here, before the fold. */}
          <FeaturedRoute doc={featured} />
        </div>

        {/* Search is the call to action. There is no "sign up" here, because
            reading is not gated. */}
        <div className="mt-10 rounded-xl bg-landing-surface p-1 shadow-md">
          <PathwaySearchBar nodes={nodes} />
        </div>

        <p className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-muted">
          <span className="tnum font-semibold text-ink-secondary">
            {stats.pathways} pathways
          </span>
          across
          <span className="tnum font-semibold text-ink-secondary">
            {stats.transitions} transitions
          </span>
          · free to read · no account needed
        </p>
      </section>

      {/* ------------------------------------------------------- How it works */}
      <section
        className="border-t border-border bg-landing-sunken"
        aria-labelledby="how-heading"
      >
        <div className="mx-auto max-w-[980px] px-5 py-14">
          <h2
            id="how-heading"
            className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl"
          >
            How it works
          </h2>

          <ol className="mt-8 grid gap-6 sm:grid-cols-3">
            {[
              {
                n: 1,
                title: 'Say where you are and where you want to go',
                body: 'Two boxes. "Nursing" to "Medical school". Type it however you say it out loud.',
              },
              {
                n: 2,
                title: 'Read the routes people actually took',
                body: 'Every step in order, with dates and how long each part ran. Not advice — a record.',
              },
              {
                n: 3,
                title: 'Compare two routes side by side',
                body: 'See where they split, which was faster, and what each one cost.',
              },
            ].map((step) => (
              <li key={step.n}>
                <span className="font-display tnum flex h-10 w-10 items-center justify-center rounded-full bg-accent text-lg font-extrabold text-ink-on-accent">
                  {step.n}
                </span>
                <h3 className="mt-4 text-md font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-sm text-ink-secondary">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* -------------------------------------------- The setbacks differentiator */}
      <section className="border-t border-border" aria-labelledby="setbacks-heading">
        <div className="mx-auto max-w-[980px] px-5 py-14">
          <span className="inline-flex items-center gap-2 rounded-full bg-surface-sunken px-3 py-1 text-xs font-semibold text-ink-secondary">
            <TrendingDown size={14} aria-hidden="true" />
            What makes this different
          </span>

          <h2
            id="setbacks-heading"
            className="font-display mt-4 max-w-[20ch] text-2xl font-extrabold tracking-tight sm:text-4xl"
          >
            The rejections are in here too.
          </h2>

          <p className="mt-5 max-w-[58ch] text-md text-ink-secondary sm:text-lg">
            Every route here records what went wrong — the rejected applications,
            the year that did not work, the pivot halfway through. If someone
            submits a pathway with no setbacks at all, we mark it{' '}
            <span className="font-semibold text-ink">incomplete</span>, not clean.
          </p>

          <p className="mt-4 max-w-[58ch] text-md text-ink-secondary sm:text-lg">
            You are not seeing a highlight reel. That is the whole point.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------ Real transitions */}
      <section
        className="border-t border-border bg-landing-sunken"
        aria-labelledby="examples-heading"
      >
        <div className="mx-auto max-w-[980px] px-5 py-14">
          <h2
            id="examples-heading"
            className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl"
          >
            Real routes in the index
          </h2>
          <p className="mt-2 text-md text-ink-secondary">
            Each bar is one person&apos;s route, start to finish. Colour is the
            kind of step; grey is where they stalled.
          </p>

          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {examples.map((doc) => (
              <li key={doc.id}>
                <Link
                  href={`/p/${doc.id}`}
                  className="card card-interactive flex h-full flex-col bg-landing-surface px-4 py-4"
                >
                  {/* The before → after line is the unit of the product. */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-md font-bold leading-tight">
                      {doc.fromLabel}
                    </span>
                    <ArrowRight
                      size={15}
                      aria-hidden="true"
                      className="shrink-0 text-ink-muted"
                    />
                    <span className="text-md font-bold leading-tight">
                      {doc.toLabel}
                    </span>
                  </div>

                  <SequenceRibbon
                    stepTypes={doc.stepTypes}
                    stepCount={doc.stepCount}
                    className="mt-3"
                  />

                  <div className="tnum mt-2.5 flex flex-wrap items-center gap-x-3 text-xs text-ink-muted">
                    <span className="font-medium text-ink-secondary">
                      {formatDuration(doc.durationMonths)}
                    </span>
                    <span>{doc.stepCount} steps</span>
                  </div>

                  <p className="mt-3 border-t border-border pt-3 text-sm font-medium text-ink">
                    {doc.outcomeResult}
                  </p>

                  <div className="mt-2.5">
                    <TierBadge tier={doc.verificationTier} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <SequenceLegend className="mt-6" />
        </div>
      </section>

      {/* ------------------------------------------------------------ Closing CTA */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-[980px] px-5 py-16 text-center">
          <h2 className="font-display mx-auto max-w-[18ch] text-3xl font-extrabold tracking-tight sm:text-4xl">
            Find out if your plan has been done before.
          </h2>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/search"
              className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-full px-7 text-md font-bold transition-colors duration-fast"
              style={{
                background: 'var(--color-accent)',
                color: 'var(--color-ink-on-accent)',
              }}
            >
              <Search size={18} aria-hidden="true" />
              Search the index
            </Link>
            <Link
              href="/submit"
              className="inline-flex h-12 cursor-pointer items-center rounded-full border border-border-strong bg-landing-surface px-7 text-md font-bold transition-colors duration-fast hover:bg-surface-hover"
            >
              Add your route
            </Link>
          </div>

          <p className="mt-5 text-sm text-ink-muted">
            No feed, no likes, no notifications. Search, read, leave.
          </p>
        </div>
      </section>
    </div>
  );
}
