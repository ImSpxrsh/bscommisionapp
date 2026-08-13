import Link from 'next/link';
import { ArrowRight, MessageSquare } from 'lucide-react';
import {
  constraintLabel,
  formatDuration,
  type Constraint,
  type StepType,
} from '@precedent/core';
import type { SearchDoc } from '@precedent/search';

import { stepColorVar } from './step-icon';
import { TierBadge } from './tier-badge';

/**
 * Result card.
 *
 * Shows exactly what the brief specifies, in order: transition line,
 * verification, duration, a compressed step timeline, starting constraints,
 * outcome, contactability. Nothing else — no author avatar, no view count, no
 * engagement signal of any kind.
 */

/**
 * Compressed step timeline: up to 7 dots colour-coded by step family, using the
 * same encoding as the profile timeline so the shape of a pathway is
 * recognisable before opening it. Setback steps render on the neutral rule
 * colour rather than a hue, matching their recessed treatment elsewhere.
 *
 * Purely indicative of rhythm, so it is aria-hidden — the profile page carries
 * the real ordered list, and the step count beside it is what a screen reader
 * hears.
 */
function StepDots({ doc }: { doc: SearchDoc }) {
  const shown = doc.stepTypes.slice(0, 7);
  return (
    <span className="inline-flex items-center gap-1" aria-hidden="true">
      {shown.map((type, i) => (
        <span
          key={`${type}-${i}`}
          className="h-1.5 w-1.5 rounded-full"
          style={{
            background: stepColorVar(type as StepType) ?? 'var(--setback-rule)',
          }}
        />
      ))}
      {doc.stepCount > 7 && (
        <span className="tnum text-2xs text-ink-muted">+{doc.stepCount - 7}</span>
      )}
    </span>
  );
}

export function ResultCard({ doc }: { doc: SearchDoc }) {
  return (
    <li>
      <Link
        href={`/p/${doc.id}`}
        className="card card-interactive block px-4 py-3.5 focus-visible:outline-2"
      >
        {/* Transition line — the primary identity of the record. */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-md font-semibold leading-tight">{doc.fromLabel}</span>
          <ArrowRight size={15} aria-hidden="true" className="text-ink-muted" />
          <span className="text-md font-semibold leading-tight">{doc.toLabel}</span>
          <TierBadge tier={doc.verificationTier} />
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-ink-muted">
          <span className="tnum font-medium text-ink-secondary">
            {formatDuration(doc.durationMonths)}
          </span>
          <span className="flex items-center gap-1.5">
            <StepDots doc={doc} />
            <span className="tnum">{doc.stepCount} steps</span>
          </span>
          {doc.hasObstaclesDocumented && <span>Obstacles documented</span>}
          <span className="tnum">Completeness {doc.completenessScore}</span>
        </div>

        {/* Starting constraints — what makes a pathway relatable or not. */}
        {doc.constraints.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1">
            {doc.constraints.slice(0, 4).map((c) => (
              <li
                key={c}
                className="rounded-sm border border-border px-1.5 py-0.5 text-2xs text-ink-secondary"
              >
                {constraintLabel[c as Constraint] ?? c}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2.5">
          <p className="text-sm text-ink-secondary">
            {doc.outcomeResult}
            {doc.industry && <span className="text-ink-muted"> · {doc.industry}</span>}
          </p>
          {doc.contactable && (
            <span className="inline-flex items-center gap-1 text-2xs font-medium text-accent">
              <MessageSquare size={11} aria-hidden="true" />
              Open to contact
            </span>
          )}
        </div>
      </Link>
    </li>
  );
}
