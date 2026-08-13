import { VERIFICATION_TIERS } from '@precedent/core';
import { tierStyle } from '@precedent/ui-tokens';

import { TierBadge } from '@/components/tier-badge';

export const metadata = {
  title: 'Trust and privacy — Precedent',
  description:
    'What Precedent does with your data, what verification actually means, and how deletion works.',
};

/**
 * The user-facing trust page. Mirrors TRUST.md at the repo root — the tier
 * meanings are read from the same token source the badges use, so this page
 * cannot drift from what a badge claims elsewhere in the product.
 */
export default function TrustPage() {
  return (
    <div className="mx-auto max-w-[720px] px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Trust and privacy</h1>
      <p className="mt-2 text-md text-ink-secondary">
        Precedent&apos;s entire dataset is other people&apos;s biographies. Here is
        what we do about that.
      </p>

      <section className="mt-8" aria-labelledby="tiers">
        <h2 id="tiers" className="text-lg font-semibold">
          What verification means
        </h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Verification attaches to specific claims, not to people, and the tier is
          derived from the signals actually present — never assigned by hand.
        </p>
        <dl className="mt-4 space-y-3">
          {VERIFICATION_TIERS.map((tier) => (
            <div key={tier} className="rounded-md border border-border bg-surface px-4 py-3">
              <dt className="mb-1">
                <TierBadge tier={tier} size="md" />
              </dt>
              <dd className="text-sm text-ink-secondary">
                {tierStyle[tier].meaning}
                <span className="mt-1 block text-xs text-ink-muted">
                  Earned by: {tierStyle[tier].earnedBy}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-10 space-y-7">
        <Commitment title="Nothing here is scraped">
          Every pathway was submitted by the person it describes, or by someone
          with documented permission. There is no importer, no crawler, and no
          “claim your profile” flow built on data collected without your action.
        </Commitment>

        <Commitment title="You choose what is public, field by field">
          Name, institution, employer, compensation, location precision,
          graduation year, GPA band, and background tags are each independently
          controllable. Compensation defaults to private. Hidden fields are
          removed from the response entirely rather than blanked — a withheld
          field does not announce itself.
        </Commitment>

        <Commitment title="Pseudonymity survives verification">
          A pseudonymous pathway can still reach source-linked or
          institution-verified. Checks run against your real identity; only the
          badge is shown. Your real name is never sent to any viewer, share card,
          or search index at any tier.
        </Commitment>

        <Commitment title="Contact is a relay">
          Contactability is opt-in per pathway and revocable. Messages route
          through a rate-limited relay — your address is never exposed. Outreach
          must include context; blank messages are rejected. You can mute or cut
          off any thread, or all of them.
        </Commitment>

        <Commitment title="Deletion is real deletion">
          One tap exports your pathway as JSON. One tap deletes it — from the
          database, the search index, the caches, and from every “similar
          pathways” list. The only thing kept is a receipt proving the erasure
          completed, which contains none of your biography.
        </Commitment>

        <Commitment title="Background tags are self-declared, never inferred">
          Nothing here derives a demographic attribute from your name,
          institution, photo, or writing. No model guesses them. Every tag is
          optional and independently hideable.
        </Commitment>

        <Commitment title="Compensation is always a band">
          Precedent cannot store an exact salary figure. This reduces the doxxing
          surface and keeps submitters clear of pay-disclosure clauses.
        </Commitment>

        <Commitment title="Under 18">
          Reading Precedent is open to everyone. Submitting a pathway requires
          being 16 or older, and submitters aged 16–17 need verified parental
          consent. Withdrawing consent unpublishes the pathway immediately.
        </Commitment>

        <Commitment title="No engagement mechanics">
          No likes, no streaks, no infinite scroll, no notifications engineered to
          pull you back. Saved-search alerts are opt-in, email-only, and capped at
          a weekly digest. Ranking never uses popularity — view and save counts
          are structurally absent from the search index.
        </Commitment>
      </div>
    </div>
  );
}

function Commitment({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-md font-semibold">{title}</h2>
      <p className="prose-pathway mt-1 text-sm">{children}</p>
    </section>
  );
}
