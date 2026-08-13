import Link from 'next/link';
import { ArrowRight, MessageSquare } from 'lucide-react';
import { constraintLabel, formatDuration, type Constraint } from '@precedent/core';
import type { SearchDoc } from '@precedent/search';

import { SequenceRibbon } from './sequence-ribbon';
import { TierBadge } from './tier-badge';

/**
 * Result card.
 *
 * Shows exactly what the brief specifies, in order: transition line,
 * verification, duration, a compressed step timeline, starting constraints,
 * outcome, contactability. Nothing else — no author avatar, no view count, no
 * engagement signal of any kind.
 *
 * Hierarchy follows what a reader is deciding between: the transition names the
 * record, the ribbon shows the shape of the route, and the outcome is the
 * payload — so the outcome carries primary ink rather than sitting muted in a
 * footer.
 */

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

        {/* The shape of the route, before the reader commits to opening it. */}
        <SequenceRibbon
          stepTypes={doc.stepTypes}
          stepCount={doc.stepCount}
          className="mt-2.5"
        />

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-ink-muted">
          <span className="tnum font-medium text-ink-secondary">
            {formatDuration(doc.durationMonths)}
          </span>
          <span className="tnum">{doc.stepCount} steps</span>
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
          <p className="text-sm font-medium text-ink">
            {doc.outcomeResult}
            {doc.industry && (
              <span className="font-normal text-ink-muted"> · {doc.industry}</span>
            )}
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
