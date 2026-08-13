import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { formatDuration, monthsBetween, type Step } from '@precedent/core';
import { stepTypeMeta } from '@precedent/ui-tokens';

import { StepIcon, stepColorVar } from '@/components/step-icon';
import { TierBadge } from '@/components/tier-badge';
import { getComparison, getExamplePathways } from '@/lib/data';

export const dynamic = 'force-dynamic';

/**
 * Compare.
 *
 * Two or three pathways on a SHARED NORMALIZED time axis — t=0 is each
 * pathway's own start, not a calendar date, because the question is "how long
 * did each route take and where did they diverge", not "who did it in 2017".
 *
 * Step types are colour-coded with the same encoding as the profile timeline,
 * so a reader can see at a glance that one route front-loaded coursework while
 * another front-loaded work experience.
 */

const MONTH_WIDTH = 5.2;

/** A short step still has to be visible, so bars have a floor width. */
const MIN_BAR_WIDTH = 14;

/** Months from the pathway's own origin, and how long the step ran. */
function stepExtent(step: Step, originMonth: string) {
  const start = monthsBetween(originMonth, step.startDate);
  const length = Math.max(monthsBetween(step.startDate, step.endDate ?? step.startDate), 1);
  return { start, length, end: start + length };
}

/**
 * Packs steps into the fewest lanes that keep them non-overlapping.
 *
 * One lane per step gives every pathway a staircase as tall as its step count,
 * which pushes the second route off the screen — and a comparison you have to
 * scroll between is not a comparison. Most routes are sequential and collapse to
 * a single lane; a second lane only appears where someone genuinely worked and
 * studied at once, which is exactly when the reader needs to see the overlap.
 */
function packLanes(steps: readonly Step[], originMonth: string): Step[][] {
  const ordered = [...steps].sort(
    (a, b) => stepExtent(a, originMonth).start - stepExtent(b, originMonth).start,
  );

  const lanes: Array<{ steps: Step[]; end: number }> = [];
  for (const step of ordered) {
    const { start, end } = stepExtent(step, originMonth);
    const lane = lanes.find((l) => l.end <= start);
    if (lane) {
      lane.steps.push(step);
      lane.end = end;
    } else {
      lanes.push({ steps: [step], end });
    }
  }
  return lanes.map((l) => l.steps);
}

function LaneBar({ step, originMonth }: { step: Step; originMonth: string }) {
  const { start, length } = stepExtent(step, originMonth);
  const isSetback = step.type === 'setback';
  const hue = stepColorVar(step.type) ?? 'var(--setback-rule)';

  return (
    <div
      className="group absolute top-0"
      style={{
        left: `${start * MONTH_WIDTH}px`,
        width: `${Math.max(length * MONTH_WIDTH, MIN_BAR_WIDTH)}px`,
      }}
      title={`${stepTypeMeta[step.type].label}: ${step.title} (${formatDuration(length)})`}
    >
      {/* A 2px surface gap between adjacent bars keeps segments distinct.
          Setbacks are recessed via a hollow neutral bar rather than by
          transparency — a one-month setback faded to 45% simply disappears,
          and the whole point is that it stays on the chart. */}
      <div
        className="h-5 rounded-sm border-2"
        style={{
          background: isSetback ? 'var(--color-surface-sunken)' : hue,
          borderColor: isSetback ? 'var(--setback-rule)' : 'var(--color-surface)',
        }}
      />
      <span className="sr-only">
        {stepTypeMeta[step.type].label}: {step.title}, {formatDuration(length)}
      </span>
    </div>
  );
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = typeof params.ids === 'string' ? params.ids : '';
  const ids = raw.split(',').filter(Boolean).slice(0, 3);
  const pathways = getComparison(ids);

  if (pathways.length < 2) {
    return <ComparePicker selectedCount={pathways.length} />;
  }

  const longest = Math.max(...pathways.map((p) => p.durationMonths));
  const yearCount = Math.ceil(longest / 12) + 1;
  const chartWidth = yearCount * 12 * MONTH_WIDTH;

  // Which step families appear, so the legend lists only what is on screen.
  const familiesShown = [
    ...new Set(pathways.flatMap((p) => p.pathway.steps.map((s) => s.type))),
  ];

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6">
      <h1 className="text-xl font-bold tracking-tight">Compare pathways</h1>
      <p className="mt-1 max-w-[70ch] text-sm text-ink-secondary">
        Each row starts at that person&apos;s own month zero, so the routes are
        comparable regardless of when they happened.
      </p>

      {/* Legend — identity is never carried by colour alone. */}
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2" aria-label="Step types">
        {familiesShown.map((type) => (
          <li key={type} className="flex items-center gap-1.5 text-xs text-ink-secondary">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ background: stepColorVar(type) ?? 'var(--setback-rule)' }}
              aria-hidden="true"
            />
            <StepIcon type={type} size={12} />
            {stepTypeMeta[type].label}
          </li>
        ))}
      </ul>

      <div className="mt-6 space-y-6 overflow-x-auto">
        {/* Shared time axis. */}
        <div className="min-w-[640px]">
          <div className="mb-1 flex" aria-hidden="true">
            {Array.from({ length: yearCount }).map((_, year) => (
              <span
                key={year}
                className="tnum shrink-0 border-l border-border pl-1 text-2xs text-ink-muted"
                style={{ width: `${12 * MONTH_WIDTH}px` }}
              >
                {year === 0 ? 'start' : `yr ${year}`}
              </span>
            ))}
          </div>

          {pathways.map(({ pathway, durationMonths }) => {
            const origin = pathway.steps.reduce(
              (min, s) => (s.startDate < min ? s.startDate : min),
              pathway.steps[0]!.startDate,
            );

            return (
              <section key={pathway.id} className="mb-5" aria-labelledby={`cmp-${pathway.id}`}>
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <h2 id={`cmp-${pathway.id}`} className="text-sm font-semibold">
                    <Link href={`/p/${pathway.id}`} className="cursor-pointer hover:text-accent">
                      {pathway.transition.from.label} → {pathway.transition.to.label}
                    </Link>
                  </h2>
                  <TierBadge tier={pathway.verification.tier} />
                  <span className="tnum text-xs text-ink-muted">
                    {formatDuration(durationMonths)} · {pathway.steps.length} steps
                  </span>
                </div>

                {/* Packed lanes: sequential steps share one row, and a second
                    row appears only where two steps genuinely overlap. */}
                <ol className="relative" style={{ width: `${chartWidth}px` }}>
                  {/* Year gridlines, so a divergence can be read off the axis
                      rather than estimated. */}
                  <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                    {Array.from({ length: yearCount }).map((_, year) => (
                      <span
                        key={year}
                        className="absolute top-0 h-full border-l border-border"
                        style={{ left: `${year * 12 * MONTH_WIDTH}px` }}
                      />
                    ))}
                  </div>

                  {packLanes(pathway.steps, origin).map((lane, i) => (
                    <li key={i} className="relative mb-0.5 h-5">
                      {lane.map((step) => (
                        <LaneBar key={step.id} step={step} originMonth={origin} />
                      ))}
                    </li>
                  ))}
                </ol>

                <p className="mt-1.5 text-xs text-ink-secondary">
                  Outcome: {pathway.outcome.result}
                </p>
              </section>
            );
          })}
        </div>
      </div>

      {/* Divergence summary — the actual question a comparison answers. */}
      <section className="mt-6 border-t border-border pt-4" aria-labelledby="diverge-heading">
        <h2 id="diverge-heading" className="text-sm font-semibold">
          Where these routes differ
        </h2>
        <dl className="mt-2 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          {pathways.map(({ pathway, durationMonths }) => {
            const setbacks = pathway.steps.filter((s) => s.type === 'setback').length;
            return (
              <div key={pathway.id} className="rounded-md border border-border bg-surface px-3 py-2">
                <dt className="text-2xs font-semibold uppercase tracking-caps text-ink-muted">
                  {pathway.person.displayName}
                </dt>
                <dd className="tnum mt-1 space-y-0.5 text-xs text-ink-secondary">
                  <div>{formatDuration(durationMonths)} total</div>
                  <div>{setbacks} recorded setback{setbacks === 1 ? '' : 's'}</div>
                  <div>{pathway.startingPoint.constraints.length} starting constraints</div>
                </dd>
              </div>
            );
          })}
        </dl>
      </section>
    </div>
  );
}

function ComparePicker({ selectedCount }: { selectedCount: number }) {
  const examples = getExamplePathways(8);

  return (
    <div className="mx-auto max-w-[840px] px-4 py-10">
      <h1 className="text-xl font-bold tracking-tight">Compare pathways</h1>
      <p className="mt-1 text-sm text-ink-secondary">
        Put two or three routes side by side on a shared timeline to see where they
        diverge. {selectedCount === 1 && 'One is selected — pick at least one more.'}
      </p>

      <h2 className="mt-6 text-xs font-semibold uppercase tracking-caps text-ink-muted">
        Pick from the index
      </h2>
      <ul className="mt-2 space-y-1.5">
        {examples.map((doc) => (
          <li key={doc.id}>
            <Link
              href={`/compare?ids=${doc.id}`}
              className="card card-interactive flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2.5"
            >
              <span className="text-sm font-semibold">{doc.fromLabel}</span>
              <ArrowRight size={13} aria-hidden="true" className="text-ink-muted" />
              <span className="text-sm font-semibold">{doc.toLabel}</span>
              <TierBadge tier={doc.verificationTier} />
              <span className="tnum ml-auto text-xs text-ink-muted">
                {formatDuration(doc.durationMonths)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
