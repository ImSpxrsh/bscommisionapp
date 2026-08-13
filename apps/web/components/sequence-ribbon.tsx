import {
  STEP_FAMILIES,
  stepFamilyStyle,
  stepTypeFamily,
  stepTypeMeta,
} from '@precedent/ui-tokens';
import type { StepType } from '@precedent/core';

import { stepColorVar } from './step-icon';

/**
 * Compressed sequence ribbon.
 *
 * The shape of a pathway — how long it ran, what kind of work it was made of,
 * and where it broke — is the thing a reader is actually scanning for. A row of
 * 6px dots could not carry that, so the encoding gets a full-width strip: one
 * segment per step, in order, on the same step-family hues as the profile
 * timeline. A pathway that is mostly education reads blue at a glance; one that
 * stalls reads with grey notches in the middle.
 *
 * This is the second of the two channels allowed to carry saturated colour (see
 * README, "Two encoding channels"), so it stays strictly on the step-family
 * palette and introduces no new hues.
 *
 * Setbacks keep their recessed treatment: the neutral rule colour at reduced
 * height, so a stall is legible as an interruption in the run without reading as
 * an error.
 *
 * Ordering is preserved and the segments are proportionally sized, so the ribbon
 * is aria-hidden — it restates the ordered step list the profile page renders
 * properly, and the adjacent step count is what a screen reader hears.
 */
export function SequenceRibbon({
  stepTypes,
  stepCount,
  className = '',
}: {
  stepTypes: readonly string[];
  stepCount?: number;
  className?: string;
}) {
  if (stepTypes.length === 0) return null;

  // A pathway can hold more steps than the doc carries types for; the remainder
  // renders as untyped track rather than being silently dropped.
  const untyped = Math.max(0, (stepCount ?? stepTypes.length) - stepTypes.length);

  return (
    <span
      className={`flex h-1.5 w-full gap-px overflow-hidden rounded-full bg-surface-sunken ${className}`}
      aria-hidden="true"
    >
      {stepTypes.map((type, i) => {
        const isSetback = stepTypeFamily[type as StepType] === 'setback';
        return (
          <span
            key={`${type}-${i}`}
            className={`flex-1 ${isSetback ? 'self-center h-0.5' : ''}`}
            style={{
              background: stepColorVar(type as StepType) ?? 'var(--setback-rule)',
            }}
            title={stepTypeMeta[type as StepType]?.label ?? type}
          />
        );
      })}
      {untyped > 0 && (
        <span className="flex-1 bg-border" style={{ flexGrow: untyped }} />
      )}
    </span>
  );
}

/**
 * Legend for the ribbon encoding.
 *
 * Without this the ribbon is decoration — a reader has no way to learn that blue
 * means education. It names the seven hue families rather than the fourteen step
 * types, because the families are what the colour actually encodes; the step
 * types are distinguished by icon and label on the profile timeline.
 */
export function SequenceLegend({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 ${className}`}>
      {STEP_FAMILIES.map((family) => {
        const style = stepFamilyStyle[family];
        const kebab = family.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
        return (
          <span key={family} className="inline-flex items-center gap-1.5">
            <span
              className="h-1.5 w-3 shrink-0 rounded-full"
              style={{
                background: style.color ? `var(--step-${kebab})` : 'var(--setback-rule)',
              }}
            />
            <span className="text-2xs text-ink-muted">{style.label}</span>
          </span>
        );
      })}
    </div>
  );
}
