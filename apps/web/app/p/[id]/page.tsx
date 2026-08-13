import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Check, CircleAlert, MessageSquare, Minus } from 'lucide-react';
import {
  compensationBandLabel,
  constraintLabel,
  formatDuration,
  type CompensationBand,
  type Constraint,
} from '@precedent/core';
import { signalLabel, tierStyle } from '@precedent/ui-tokens';

import { SequenceLegend, SequenceRibbon } from '@/components/sequence-ribbon';
import { Timeline } from '@/components/timeline';
import { TierBadge } from '@/components/tier-badge';
import { getProfile } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = getProfile(id);
  if (!profile) notFound();

  const { pathway, completeness, durationMonths, similar } = profile;
  const { transition, person, startingPoint, outcome, reflection, verification, contact } = pathway;

  const hasFriction = pathway.steps.some((s) => s.obstacle || s.type === 'setback');

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <article>
          {/* 1. Transition header */}
          <header className="border-b border-border pb-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold tracking-tight">
                {transition.from.label}
                <ArrowRight size={18} aria-hidden="true" className="text-ink-muted" />
                {transition.to.label}
              </h1>
              <TierBadge tier={verification.tier} size="md" />
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted">
              <span className="tnum font-medium text-ink-secondary">
                {formatDuration(durationMonths)} total
              </span>
              <span className="tnum">{pathway.steps.length} steps</span>
              <span>{person.displayName}</span>
              {person.isAnonymous && <span className="text-2xs">(anonymous)</span>}
            </div>

            {/* Minimap of the sequence below — the same encoding the reader has
                already learned on the results page, so the shape of this route
                is recognisable before scrolling into the step detail. */}
            <SequenceRibbon
              stepTypes={pathway.steps.map((s) => s.type)}
              stepCount={pathway.steps.length}
              className="mt-3"
            />
            <SequenceLegend className="mt-2" />

            {!hasFriction && !pathway.attestedNoObstacles && (
              <p className="mt-3 flex items-start gap-2 rounded-md border border-border bg-surface-sunken px-3 py-2 text-xs text-ink-secondary">
                <CircleAlert size={14} aria-hidden="true" className="mt-px shrink-0" />
                This pathway records no obstacles or setbacks. That usually means it
                is incomplete rather than that the route was frictionless.
              </p>
            )}
          </header>

          {/* 2. Starting conditions — the honest baseline. */}
          <section className="mt-5" aria-labelledby="start-heading">
            <h2 id="start-heading" className="mb-2 text-lg font-semibold">
              Starting conditions
            </h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-md border border-border bg-surface px-4 py-3 text-sm sm:grid-cols-3">
              <Field label="Institution" value={startingPoint.institution} />
              <Field label="Major" value={startingPoint.major} />
              <Field label="GPA band" value={startingPoint.gpaBand} numeric />
              <Field label="Graduated" value={person.graduationYear} numeric />
              {person.locations?.[0] && <Field label="Location" value={person.locations[0]} />}
            </dl>

            {startingPoint.constraints.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {startingPoint.constraints.map((c) => (
                  <li
                    key={c}
                    className="rounded-sm border border-border bg-surface px-2 py-1 text-xs text-ink-secondary"
                  >
                    {constraintLabel[c as Constraint] ?? c}
                  </li>
                ))}
              </ul>
            )}

            {startingPoint.priorExperience && (
              <p className="prose-pathway mt-2 text-sm">{startingPoint.priorExperience}</p>
            )}
          </section>

          {/* 3. The timeline */}
          <div className="mt-7">
            <Timeline steps={pathway.steps} asOf={outcome.date} />
          </div>

          {/* 4. Outcome */}
          <section className="mt-7" aria-labelledby="outcome-heading">
            <h2 id="outcome-heading" className="mb-2 text-lg font-semibold">
              Outcome
            </h2>
            <div className="rounded-md border border-border bg-surface px-4 py-3">
              <p className="text-md font-semibold">{outcome.result}</p>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-secondary">
                {outcome.organization && <span>{outcome.organization}</span>}
                <time className="tnum" dateTime={outcome.date}>
                  {outcome.date}
                </time>
                {outcome.compensationBand && (
                  <span className="tnum">
                    {compensationBandLabel[outcome.compensationBand as CompensationBand] ??
                      outcome.compensationBand}
                  </span>
                )}
                {!outcome.isFinal && (
                  <span className="text-ink-muted">Still in progress</span>
                )}
              </div>
            </div>
          </section>

          {/* 5. Reflection */}
          {reflection && (
            <section className="mt-7" aria-labelledby="reflection-heading">
              <h2 id="reflection-heading" className="mb-2 text-lg font-semibold">
                Reflection
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <ReflectionList
                  title="Would repeat"
                  items={reflection.whatIdRepeat}
                  icon={<Check size={12} aria-hidden="true" />}
                />
                <ReflectionList
                  title="Would skip"
                  items={reflection.whatIdSkip}
                  icon={<Minus size={12} aria-hidden="true" />}
                />
              </div>

              {reflection.biggestObstacle && (
                <div className="mt-3 rounded-md border border-border bg-surface px-4 py-3">
                  <h3 className="text-2xs font-semibold uppercase tracking-caps text-ink-muted">
                    Biggest obstacle
                  </h3>
                  <p className="prose-pathway mt-1 text-sm">{reflection.biggestObstacle}</p>
                </div>
              )}

              {reflection.luckFactors.length > 0 && (
                <div className="mt-3 rounded-md border border-border bg-surface px-4 py-3">
                  <h3 className="text-2xs font-semibold uppercase tracking-caps text-ink-muted">
                    What was luck
                  </h3>
                  <ul className="prose-pathway mt-1 list-disc space-y-1 pl-4 text-sm">
                    {reflection.luckFactors.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}

              {reflection.costEstimate && (
                <p className="tnum mt-3 text-sm text-ink-secondary">
                  <span className="font-medium">Estimated cost:</span> {reflection.costEstimate}
                </p>
              )}
            </section>
          )}
        </article>

        {/* Sidebar: verification, completeness, actions, adjacent */}
        <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          {/* 6. Verification panel — itemised, never a single opaque checkmark. */}
          <section
            className="rounded-md border border-border bg-surface px-4 py-3"
            aria-labelledby="verification-heading"
          >
            <h2 id="verification-heading" className="text-sm font-semibold">
              Verification
            </h2>
            <p className="mt-1 text-xs text-ink-secondary">
              {tierStyle[verification.tier].meaning}
            </p>

            {verification.signals.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {verification.signals.map((signal, i) => (
                  <li key={`${signal.kind}-${i}`} className="text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{signalLabel[signal.kind]}</span>
                      <span
                        className="rounded-sm px-1.5 py-px text-2xs font-medium"
                        style={{
                          color:
                            signal.status === 'passed'
                              ? 'var(--status-good)'
                              : 'var(--color-ink-muted)',
                        }}
                      >
                        {signal.status}
                      </span>
                    </div>
                    <p className="tnum mt-0.5 text-2xs text-ink-muted">
                      {signal.claimRef === 'identity'
                        ? 'Identity'
                        : `Step ${pathway.steps.findIndex((s) => s.id === signal.claimRef) + 1}`}
                      {signal.checkedAt && ` · checked ${signal.checkedAt.slice(0, 10)}`}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-ink-muted">
                Nothing has been checked on this pathway.
              </p>
            )}
          </section>

          {/* Completeness — visible and explained, so it nudges quality. */}
          <section
            className="rounded-md border border-border bg-surface px-4 py-3"
            aria-labelledby="completeness-heading"
          >
            <div className="flex items-baseline justify-between">
              <h2 id="completeness-heading" className="text-sm font-semibold">
                Completeness
              </h2>
              <span className="tnum text-lg font-bold">{completeness.score}</span>
            </div>
            <ul className="mt-2 space-y-1.5">
              {completeness.components.map((c) => (
                <li key={c.label} className="text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-ink-secondary">{c.label}</span>
                    <span className="tnum text-ink-muted">
                      {Math.round(c.earned)}/{c.possible}
                    </span>
                  </div>
                  <div
                    className="mt-0.5 h-1 w-full overflow-hidden rounded-full"
                    style={{ background: 'var(--color-muted, var(--color-border))' }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(c.earned / c.possible) * 100}%`,
                        background: 'var(--color-accent)',
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* 7. Actions */}
          <section className="space-y-2" aria-label="Actions">
            <button
              type="button"
              className="w-full cursor-pointer rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors duration-fast hover:bg-surface-hover"
            >
              Save to a collection
            </button>
            <Link
              href={`/compare?ids=${pathway.id}`}
              className="block w-full cursor-pointer rounded-md border border-border px-3 py-2 text-center text-sm font-medium transition-colors duration-fast hover:bg-surface-hover"
            >
              Add to comparison
            </Link>
            {contact.isOpen ? (
              <button
                type="button"
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-fast"
                style={{ background: 'var(--color-accent)', color: 'var(--color-ink-on-accent)' }}
              >
                <MessageSquare size={14} aria-hidden="true" />
                Request contact
              </button>
            ) : (
              <p className="rounded-md border border-border px-3 py-2 text-center text-xs text-ink-muted">
                Not open to contact
              </p>
            )}
            {contact.isOpen && contact.topics.length > 0 && (
              <p className="text-2xs text-ink-muted">
                Happy to discuss: {contact.topics.join(', ')}. Messages go through a
                rate-limited relay — their address is never shared.
              </p>
            )}
          </section>

          {/* 8. Adjacent pathways */}
          {similar.length > 0 && (
            <section aria-labelledby="similar-heading">
              <h2
                id="similar-heading"
                className="mb-2 text-xs font-semibold uppercase tracking-caps text-ink-muted"
              >
                Adjacent pathways
              </h2>
              <ul className="space-y-1.5">
                {similar.map((doc) => (
                  <li key={doc.id}>
                    <Link
                      href={`/p/${doc.id}`}
                      className="card card-interactive block px-3 py-2 text-xs"
                    >
                      <span className="font-medium">
                        {doc.fromLabel} → {doc.toLabel}
                      </span>
                      <span className="tnum mt-0.5 block text-ink-muted">
                        {formatDuration(doc.durationMonths)} · {doc.stepCount} steps
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  numeric = false,
}: {
  label: string;
  value?: string | null;
  numeric?: boolean;
}) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-2xs font-semibold uppercase tracking-caps text-ink-muted">{label}</dt>
      <dd className={`mt-0.5 font-medium ${numeric ? 'tnum' : ''}`}>{value}</dd>
    </div>
  );
}

function ReflectionList({
  title,
  items,
  icon,
}: {
  title: string;
  items: string[];
  icon: React.ReactNode;
}) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-md border border-border bg-surface px-4 py-3">
      <h3 className="text-2xs font-semibold uppercase tracking-caps text-ink-muted">{title}</h3>
      <ul className="mt-1.5 space-y-1.5">
        {items.map((item) => (
          <li key={item} className="prose-pathway flex gap-2 text-sm">
            <span className="mt-1 shrink-0 text-ink-muted">{icon}</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
