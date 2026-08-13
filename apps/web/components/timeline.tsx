'use client';

import { useId, useState } from 'react';
import { ChevronDown, ExternalLink, Star } from 'lucide-react';
import type { Step } from '@precedent/core';
import { formatDuration, monthsBetween } from '@precedent/core';

import { StepIcon, stepColorVar, stepLabel } from './step-icon';

/**
 * The pathway timeline.
 *
 * Semantics: a real <ol>, because the sequence IS the content — a screen reader
 * user needs "step 4 of 10" and the dates read out, not a pile of divs. Each
 * node's disclosure is a button with aria-expanded/aria-controls, so the whole
 * timeline is operable from the keyboard with no custom key handling.
 *
 * Setback steps render recessed — sunken surface, muted ink, neutral rule — and
 * are never hidden or collapsed away. They carry no hue at all: red would read
 * as an error the reader must fix, when it is in fact the most useful part of an
 * honest account.
 */

function formatMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number) as [number, number];
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function StepNode({
  step,
  index,
  total,
  asOf,
  expanded,
  onToggle,
}: {
  step: Step;
  index: number;
  total: number;
  asOf: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const panelId = useId();
  const isSetback = step.type === 'setback';
  const hue = stepColorVar(step.type);
  const months = monthsBetween(step.startDate, step.endDate ?? asOf);

  const hasDetail = Boolean(
    step.description || step.obstacle || step.evidenceUrl || step.advice,
  );

  const range = step.endDate
    ? `${formatMonth(step.startDate)} – ${formatMonth(step.endDate)}`
    : `${formatMonth(step.startDate)} – ongoing`;

  return (
    <li className="relative pl-8">
      {/* Rail connector. Decorative — the <ol> already conveys sequence. */}
      <span
        aria-hidden="true"
        className="absolute left-[7px] top-6 bottom-0 w-px"
        style={{ background: 'var(--color-border)' }}
      />
      {/* Node marker, coloured by step family. */}
      <span
        aria-hidden="true"
        className="absolute left-0 top-[6px] flex h-4 w-4 items-center justify-center rounded-full border-2"
        style={{
          background: 'var(--color-surface)',
          borderColor: hue ?? 'var(--setback-rule)',
        }}
      >
        {step.wasPivotal && (
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: hue ?? 'var(--setback-rule)' }}
          />
        )}
      </span>

      <div
        className={`mb-2 rounded-md border px-3 py-2.5 ${isSetback ? '' : ''}`}
        style={{
          background: isSetback ? 'var(--color-surface-sunken)' : 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          borderLeftWidth: 'var(--border-rule)',
          borderLeftColor: hue ?? 'var(--setback-rule)',
        }}
      >
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span
            className="inline-flex items-center gap-1 text-2xs font-medium uppercase tracking-caps"
            style={{ color: isSetback ? 'var(--setback-ink)' : hue ?? 'var(--color-ink-muted)' }}
          >
            <StepIcon type={step.type} size={12} />
            {stepLabel(step.type)}
          </span>

          <time className="tnum text-2xs text-ink-muted" dateTime={step.startDate}>
            {range}
          </time>

          <span className="tnum rounded-sm border border-border px-1.5 py-px text-2xs text-ink-muted">
            {formatDuration(months)}
          </span>

          {step.wasPivotal && (
            <span
              className="inline-flex items-center gap-1 text-2xs font-medium"
              style={{ color: 'var(--color-accent)' }}
            >
              <Star size={10} aria-hidden="true" fill="currentColor" />
              Pivotal
            </span>
          )}
        </div>

        <h3
          className="mt-1 text-base font-semibold"
          style={{ color: isSetback ? 'var(--setback-ink)' : 'var(--color-ink)' }}
        >
          {step.title}
        </h3>

        {step.organization && (
          <p className="text-sm text-ink-secondary">{step.organization}</p>
        )}

        {hasDetail && (
          <>
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={expanded}
              aria-controls={panelId}
              className="mt-1.5 inline-flex cursor-pointer items-center gap-1 rounded-sm text-xs font-medium text-accent transition-colors duration-fast hover:text-accent-hover"
            >
              <ChevronDown
                size={13}
                aria-hidden="true"
                className="transition-transform duration-fast"
                style={{ transform: expanded ? 'rotate(180deg)' : 'none' }}
              />
              {expanded ? 'Hide detail' : 'Show detail'}
              <span className="sr-only"> for step {index + 1} of {total}</span>
            </button>

            <div id={panelId} hidden={!expanded} className="mt-2 space-y-3">
              {step.description && (
                <p className="prose-pathway text-sm">{step.description}</p>
              )}

              {step.obstacle && (
                <div
                  className="rounded-md border px-3 py-2"
                  style={{
                    borderColor: 'var(--color-border)',
                    background: 'var(--color-surface-sunken)',
                  }}
                >
                  <p className="text-2xs font-semibold uppercase tracking-caps text-ink-muted">
                    Obstacle
                  </p>
                  <p className="prose-pathway mt-0.5 text-sm">{step.obstacle.description}</p>
                  <p className="mt-2 text-2xs font-semibold uppercase tracking-caps text-ink-muted">
                    How it was resolved
                  </p>
                  <p className="prose-pathway mt-0.5 text-sm">{step.obstacle.howResolved}</p>
                </div>
              )}

              {step.advice && (
                <p className="prose-pathway border-l-2 pl-3 text-sm italic" style={{ borderColor: 'var(--color-border-strong)' }}>
                  {step.advice}
                </p>
              )}

              {step.evidenceUrl && (
                <a
                  href={step.evidenceUrl}
                  rel="noopener noreferrer nofollow"
                  target="_blank"
                  className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-accent underline underline-offset-2 transition-colors duration-fast hover:text-accent-hover"
                >
                  <ExternalLink size={12} aria-hidden="true" />
                  Evidence for this step
                </a>
              )}
            </div>
          </>
        )}
      </div>
    </li>
  );
}

export function Timeline({
  steps,
  asOf,
  defaultExpanded = false,
}: {
  steps: Step[];
  asOf: string;
  /** Desktop opens the first pivotal step; mobile starts fully collapsed. */
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(() =>
    defaultExpanded ? new Set(steps.map((s) => s.id)) : new Set(),
  );

  const allOpen = expanded.size === steps.length;

  const toggleAll = () => {
    setExpanded(allOpen ? new Set() : new Set(steps.map((s) => s.id)));
  };

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section aria-labelledby="timeline-heading">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="timeline-heading" className="text-lg font-semibold">
          The sequence
          <span className="ml-2 tnum text-sm font-normal text-ink-muted">
            {steps.length} steps
          </span>
        </h2>
        <button
          type="button"
          onClick={toggleAll}
          aria-expanded={allOpen}
          className="cursor-pointer rounded-sm border border-border px-2.5 py-1 text-xs font-medium transition-colors duration-fast hover:bg-surface-hover"
        >
          {allOpen ? 'Collapse all steps' : 'Expand all steps'}
        </button>
      </div>

      <ol className="space-y-0">
        {steps.map((step, i) => (
          <StepNode
            key={step.id}
            step={step}
            index={i}
            total={steps.length}
            asOf={asOf}
            expanded={expanded.has(step.id)}
            onToggle={() => toggle(step.id)}
          />
        ))}
      </ol>
    </section>
  );
}
