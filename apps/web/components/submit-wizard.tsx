'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Plus, Trash2 } from 'lucide-react';
import {
  CONSTRAINTS,
  STEP_TYPES,
  constraintLabel,
  formatDuration,
  monthsBetween,
  type Constraint,
  type StepType,
} from '@precedent/core';
import { stepTypeMeta } from '@precedent/ui-tokens';

import { stepColorVar } from './step-icon';

/**
 * Submission wizard.
 *
 * Save-and-resume with autosave to localStorage on every change, because these
 * forms are long and losing one is the fastest way to lose a submission.
 *
 * The step builder is the core of the product, and the obstacle gate is the
 * reason it exists: submission is BLOCKED at zero recorded obstacles unless the
 * author explicitly attests there genuinely were none. Every pathway resource
 * that already exists is survivorship-sanitized; this is the mechanism that
 * stops Precedent from becoming another one.
 *
 * Accessibility: each step announces its position, the current step is exposed
 * via aria-current, and validation errors are surfaced in an aria-live region
 * rather than only as colour.
 */

const STORAGE_KEY = 'precedent:draft:v1';

type DraftStep = {
  id: string;
  type: StepType;
  title: string;
  organization: string;
  startDate: string;
  endDate: string;
  description: string;
  wasPivotal: boolean;
  obstacleDescription: string;
  obstacleResolution: string;
};

type Draft = {
  fromLabel: string;
  toLabel: string;
  institution: string;
  major: string;
  constraints: Constraint[];
  steps: DraftStep[];
  outcomeResult: string;
  outcomeDate: string;
  attestedNoObstacles: boolean;
};

const EMPTY_DRAFT: Draft = {
  fromLabel: '',
  toLabel: '',
  institution: '',
  major: '',
  constraints: [],
  steps: [],
  outcomeResult: '',
  outcomeDate: '',
  attestedNoObstacles: false,
};

const WIZARD_STEPS = [
  'Transition',
  'Starting conditions',
  'The sequence',
  'Outcome',
  'Review',
] as const;

const newStep = (): DraftStep => ({
  id: `draft_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  type: 'coursework',
  title: '',
  organization: '',
  startDate: '',
  endDate: '',
  description: '',
  wasPivotal: false,
  obstacleDescription: '',
  obstacleResolution: '',
});

export function SubmitWizard() {
  const [stage, setStage] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [restored, setRestored] = useState(false);

  // Restore any saved draft on mount.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setDraft({ ...EMPTY_DRAFT, ...JSON.parse(saved) });
        setRestored(true);
      }
    } catch {
      /* a corrupt draft should never block the form */
    }
  }, []);

  // Autosave on every change.
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      /* storage unavailable (private mode) — the form still works */
    }
  }, [draft]);

  const update = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const obstacleCount = useMemo(
    () =>
      draft.steps.filter(
        (s) => s.type === 'setback' || s.obstacleDescription.trim().length > 0,
      ).length,
    [draft.steps],
  );

  const obstacleGateBlocked = obstacleCount === 0 && !draft.attestedNoObstacles;

  return (
    <div className="mx-auto max-w-[760px] px-4 py-8">
      <h1 className="text-xl font-bold tracking-tight">Add your pathway</h1>
      <p className="mt-1 text-sm text-ink-secondary">
        Structure first. The sequence of steps is what makes this useful to
        someone standing where you started.
      </p>

      {restored && (
        <p className="mt-3 rounded-md border border-border bg-surface-sunken px-3 py-2 text-xs text-ink-secondary">
          Restored your saved draft. Everything autosaves as you go.
        </p>
      )}

      {/* Progress. Announces position for screen readers. */}
      <ol className="mt-5 flex flex-wrap gap-1.5" aria-label="Submission steps">
        {WIZARD_STEPS.map((label, i) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => setStage(i)}
              aria-current={i === stage ? 'step' : undefined}
              className="cursor-pointer rounded-sm border px-2.5 py-1 text-xs font-medium transition-colors duration-fast"
              style={{
                borderColor: i === stage ? 'var(--color-accent)' : 'var(--color-border)',
                background: i === stage ? 'var(--color-accent-subtle)' : 'transparent',
                color: i <= stage ? 'var(--color-ink)' : 'var(--color-ink-muted)',
              }}
            >
              <span className="tnum">{i + 1}</span>. {label}
              <span className="sr-only">
                {' '}
                (step {i + 1} of {WIZARD_STEPS.length})
              </span>
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-6">
        {stage === 0 && (
          <Fieldset legend="What transition did you make?">
            <Text label="From" value={draft.fromLabel} onChange={(v) => update({ fromLabel: v })} placeholder="Electrical Engineering" />
            <Text label="To" value={draft.toLabel} onChange={(v) => update({ toLabel: v })} placeholder="Dental School" />
            <p className="text-xs text-ink-muted">
              Type anything. If it is not in our taxonomy yet we will match it
              during review rather than block you.
            </p>
          </Fieldset>
        )}

        {stage === 1 && (
          <Fieldset legend="Where were you starting from?">
            <Text label="Institution" value={draft.institution} onChange={(v) => update({ institution: v })} placeholder="State University" />
            <Text label="Major or field" value={draft.major} onChange={(v) => update({ major: v })} placeholder="Electrical Engineering" />

            <div>
              <span className="mb-1.5 block text-2xs font-semibold uppercase tracking-caps text-ink-muted">
                Constraints you were under
              </span>
              <p className="mb-2 text-xs text-ink-secondary">
                These are what make your pathway relatable. All optional, all
                self-declared, and each can be hidden from public view later.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {CONSTRAINTS.map((c) => {
                  const on = draft.constraints.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        update({
                          constraints: on
                            ? draft.constraints.filter((x) => x !== c)
                            : [...draft.constraints, c],
                        })
                      }
                      className="cursor-pointer rounded-sm border px-2 py-1 text-xs transition-colors duration-fast"
                      style={{
                        borderColor: on ? 'var(--color-accent)' : 'var(--color-border)',
                        background: on ? 'var(--color-accent-subtle)' : 'transparent',
                      }}
                    >
                      {constraintLabel[c]}
                    </button>
                  );
                })}
              </div>
            </div>
          </Fieldset>
        )}

        {stage === 2 && (
          <StepBuilder
            steps={draft.steps}
            onChange={(steps) => update({ steps })}
            obstacleCount={obstacleCount}
            attested={draft.attestedNoObstacles}
            onAttest={(v) => update({ attestedNoObstacles: v })}
            blocked={obstacleGateBlocked}
          />
        )}

        {stage === 3 && (
          <Fieldset legend="How did it end?">
            <Text label="Result" value={draft.outcomeResult} onChange={(v) => update({ outcomeResult: v })} placeholder="Accepted to dental school (DMD)" />
            <Text label="Date" type="month" value={draft.outcomeDate} onChange={(v) => update({ outcomeDate: v })} />
            <p className="text-xs text-ink-muted">
              Compensation, if you choose to share it later, is always recorded as
              a band. Precedent cannot store an exact figure.
            </p>
          </Fieldset>
        )}

        {stage === 4 && (
          <Review draft={draft} obstacleCount={obstacleCount} blocked={obstacleGateBlocked} />
        )}
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
        <button
          type="button"
          onClick={() => setStage((s) => Math.max(0, s - 1))}
          disabled={stage === 0}
          className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium transition-colors duration-fast hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Back
        </button>

        <button
          type="button"
          onClick={() => setStage((s) => Math.min(WIZARD_STEPS.length - 1, s + 1))}
          disabled={stage === WIZARD_STEPS.length - 1}
          className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-md px-4 text-sm font-medium transition-colors duration-fast disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: 'var(--color-accent)', color: 'var(--color-ink-on-accent)' }}
        >
          Continue
          <ArrowRight size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function StepBuilder({
  steps,
  onChange,
  obstacleCount,
  attested,
  onAttest,
  blocked,
}: {
  steps: DraftStep[];
  onChange: (steps: DraftStep[]) => void;
  obstacleCount: number;
  attested: boolean;
  onAttest: (v: boolean) => void;
  blocked: boolean;
}) {
  const patch = (id: string, p: Partial<DraftStep>) =>
    onChange(steps.map((s) => (s.id === id ? { ...s, ...p } : s)));

  const move = (index: number, delta: number) => {
    const next = [...steps];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next);
  };

  return (
    <div>
      <h2 className="text-lg font-semibold">The sequence</h2>
      <p className="mt-1 text-sm text-ink-secondary">
        One entry per discrete thing you did. This is the part people actually
        come here for.
      </p>

      <ol className="mt-4 space-y-3">
        {steps.map((step, i) => {
          const hue = stepColorVar(step.type) ?? 'var(--setback-rule)';
          const months =
            step.startDate && step.endDate
              ? monthsBetween(step.startDate, step.endDate)
              : null;

          return (
            <li
              key={step.id}
              className="rounded-md border bg-surface px-3 py-3"
              style={{
                borderColor: 'var(--color-border)',
                borderLeftWidth: 'var(--border-rule)',
                borderLeftColor: hue,
              }}
            >
              <div className="flex items-center gap-2">
                <span className="tnum text-xs font-semibold text-ink-muted">{i + 1}</span>
                <select
                  value={step.type}
                  onChange={(e) => patch(step.id, { type: e.target.value as StepType })}
                  aria-label={`Step ${i + 1} type`}
                  className="cursor-pointer rounded-md border border-border bg-surface px-2 py-1 text-xs"
                >
                  {STEP_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {stepTypeMeta[t].label}
                    </option>
                  ))}
                </select>

                {months !== null && (
                  <span className="tnum rounded-sm border border-border px-1.5 py-px text-2xs text-ink-muted">
                    {formatDuration(months)}
                  </span>
                )}

                <div className="ml-auto flex items-center gap-1">
                  <button type="button" onClick={() => move(i, -1)} aria-label={`Move step ${i + 1} earlier`} className="cursor-pointer rounded-sm p-1 text-ink-muted transition-colors duration-fast hover:bg-surface-hover">↑</button>
                  <button type="button" onClick={() => move(i, 1)} aria-label={`Move step ${i + 1} later`} className="cursor-pointer rounded-sm p-1 text-ink-muted transition-colors duration-fast hover:bg-surface-hover">↓</button>
                  <button
                    type="button"
                    onClick={() => onChange(steps.filter((s) => s.id !== step.id))}
                    aria-label={`Remove step ${i + 1}`}
                    className="cursor-pointer rounded-sm p-1 text-ink-muted transition-colors duration-fast hover:bg-surface-hover"
                  >
                    <Trash2 size={13} aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="mt-2 space-y-2">
                <Text label="What did you do?" value={step.title} onChange={(v) => patch(step.id, { title: v })} placeholder="Shadowed a general dentist" />
                <div className="grid grid-cols-2 gap-2">
                  <Text label="Start" type="month" value={step.startDate} onChange={(v) => patch(step.id, { startDate: v })} />
                  <Text label="End" type="month" value={step.endDate} onChange={(v) => patch(step.id, { endDate: v })} />
                </div>

                <label className="flex cursor-pointer items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={step.wasPivotal}
                    onChange={(e) => patch(step.id, { wasPivotal: e.target.checked })}
                    className="h-3.5 w-3.5 cursor-pointer accent-[var(--color-accent)]"
                  />
                  This was a turning point
                </label>

                <details className="rounded-md border border-border px-2 py-1.5">
                  <summary className="cursor-pointer text-xs font-medium">
                    Did anything go wrong here?
                  </summary>
                  <div className="mt-2 space-y-2">
                    <Text label="What went wrong" value={step.obstacleDescription} onChange={(v) => patch(step.id, { obstacleDescription: v })} />
                    <Text label="How you resolved it" value={step.obstacleResolution} onChange={(v) => patch(step.id, { obstacleResolution: v })} />
                  </div>
                </details>
              </div>
            </li>
          );
        })}
      </ol>

      <button
        type="button"
        onClick={() => onChange([...steps, newStep()])}
        className="mt-3 inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium transition-colors duration-fast hover:bg-surface-hover"
      >
        <Plus size={14} aria-hidden="true" />
        Add a step
      </button>

      {/* The obstacle gate. */}
      <div
        className="mt-5 rounded-md border px-4 py-3"
        style={{
          borderColor: blocked ? 'var(--status-warning)' : 'var(--color-border)',
          background: 'var(--color-surface-sunken)',
        }}
        aria-live="polite"
      >
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          {blocked ? (
            <AlertTriangle size={15} aria-hidden="true" style={{ color: 'var(--status-warning)' }} />
          ) : (
            <Check size={15} aria-hidden="true" style={{ color: 'var(--status-good)' }} />
          )}
          Obstacles recorded: <span className="tnum">{obstacleCount}</span>
        </h3>

        {blocked ? (
          <>
            <p className="mt-1 text-sm text-ink-secondary">
              You have not recorded a single setback or obstacle. Almost every real
              pathway has at least one, and the omitted parts are usually the most
              useful. Add one above, or confirm below that there genuinely
              weren&apos;t any.
            </p>
            <label className="mt-2 flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={attested}
                onChange={(e) => onAttest(e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 cursor-pointer accent-[var(--color-accent)]"
              />
              There genuinely weren&apos;t any obstacles on this pathway.
            </label>
          </>
        ) : (
          <p className="mt-1 text-sm text-ink-secondary">
            {attested
              ? 'Recorded as a pathway with no obstacles. This will be shown to readers as an explicit claim.'
              : 'This is what makes your pathway more useful than a success story.'}
          </p>
        )}
      </div>
    </div>
  );
}

function Review({
  draft,
  obstacleCount,
  blocked,
}: {
  draft: Draft;
  obstacleCount: number;
  blocked: boolean;
}) {
  const missing: string[] = [];
  if (!draft.fromLabel) missing.push('starting point');
  if (!draft.toLabel) missing.push('destination');
  if (draft.steps.length === 0) missing.push('at least one step');
  if (!draft.outcomeResult) missing.push('outcome');

  const ready = missing.length === 0 && !blocked;

  return (
    <div>
      <h2 className="text-lg font-semibold">Review</h2>

      <dl className="mt-3 space-y-2 rounded-md border border-border bg-surface px-4 py-3 text-sm">
        <Row label="Transition" value={`${draft.fromLabel || '—'} → ${draft.toLabel || '—'}`} />
        <Row label="Starting point" value={[draft.institution, draft.major].filter(Boolean).join(', ') || '—'} />
        <Row label="Constraints" value={draft.constraints.length ? `${draft.constraints.length} declared` : 'none'} />
        <Row label="Steps" value={String(draft.steps.length)} />
        <Row label="Obstacles recorded" value={String(obstacleCount)} />
        <Row label="Outcome" value={draft.outcomeResult || '—'} />
      </dl>

      <div className="mt-4" aria-live="polite">
        {ready ? (
          <p className="rounded-md border px-3 py-2 text-sm" style={{ borderColor: 'var(--status-good)' }}>
            Ready to submit. Next you would set identity and privacy, connect a
            verification signal, and choose contact preferences.
          </p>
        ) : (
          <div className="rounded-md border px-3 py-2 text-sm" style={{ borderColor: 'var(--status-warning)' }}>
            <p className="font-medium">Not ready yet:</p>
            <ul className="mt-1 list-disc pl-4 text-ink-secondary">
              {missing.map((m) => (
                <li key={m}>Missing {m}.</li>
              ))}
              {blocked && <li>Record an obstacle, or confirm there were none.</li>}
            </ul>
          </div>
        )}
      </div>

      <button
        type="button"
        disabled={!ready}
        className="mt-4 h-10 w-full cursor-pointer rounded-md text-sm font-medium transition-colors duration-fast disabled:cursor-not-allowed disabled:opacity-40"
        style={{ background: 'var(--color-accent)', color: 'var(--color-ink-on-accent)' }}
      >
        Continue to identity and verification
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function Fieldset({ legend, children }: { legend: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-0 p-0">
      <legend className="mb-3 text-lg font-semibold">{legend}</legend>
      <div className="space-y-3">{children}</div>
    </fieldset>
  );
}

function Text({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  // React's useId is stable across server and client render. A module-level
  // counter is not — it produces different ids on each and breaks hydration.
  const id = `f-${label.replace(/\s+/g, '-').toLowerCase()}-${useId()}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-2xs font-semibold uppercase tracking-caps text-ink-muted">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm transition-colors duration-fast focus:border-border-strong"
      />
    </div>
  );
}
