/**
 * Verification.
 *
 * Two rules drive the whole design:
 *
 * 1. Verification attaches to SPECIFIC CLAIMS, not to a person. A pathway can
 *    hold an institution-verified education step next to an unverified
 *    compensation figure, and the UI shows it at that granularity.
 * 2. We store WHAT was checked and WHEN, never a boolean. A bare `verified:true`
 *    cannot be audited, cannot expire, and cannot be explained to a user.
 *
 * Pseudonymity is fully compatible with verification: checks run against the
 * real identity, and only the resulting badge is displayed. Reaching
 * `source-linked` never exposes who the person is.
 */

import { z } from 'zod';

export const VERIFICATION_TIERS = [
  'unverified',
  'self-attested',
  'source-linked',
  'institution-verified',
] as const;

export const VerificationTier = z.enum(VERIFICATION_TIERS);
export type VerificationTier = z.infer<typeof VerificationTier>;

export const tierRank = {
  unverified: 0,
  'self-attested': 1,
  'source-linked': 2,
  'institution-verified': 3,
} as const satisfies Record<VerificationTier, number>;

export const SIGNAL_KINDS = [
  'linkedin_oauth',
  'edu_email_domain',
  'employer_email_domain',
  'public_profile_url',
  'credential_upload',
  'manual_review',
] as const;

export const SignalKind = z.enum(SIGNAL_KINDS);
export type SignalKind = z.infer<typeof SignalKind>;

export const SignalStatus = z.enum(['pending', 'passed', 'failed', 'expired']);
export type SignalStatus = z.infer<typeof SignalStatus>;

export const VerificationSignal = z.object({
  kind: SignalKind,
  status: SignalStatus,
  checkedAt: z.string().datetime().nullable(),
  /**
   * Opaque reference to the stored artifact (object-storage key, OAuth subject
   * hash). Never the artifact itself, and never rendered to a viewer.
   */
  evidenceRef: z.string().optional(),
  /**
   * Which claim this signal corroborates: a step id, or 'identity' for
   * whole-person identity checks. This is what makes verification granular.
   */
  claimRef: z.string().default('identity'),
  expiresAt: z.string().datetime().nullable().default(null),
});
export type VerificationSignal = z.infer<typeof VerificationSignal>;

export const Verification = z.object({
  tier: VerificationTier,
  signals: z.array(VerificationSignal).default([]),
  lastReviewedAt: z.string().datetime().nullable().default(null),
  reviewerNote: z.string().max(2000).optional(),
});
export type Verification = z.infer<typeof Verification>;

/** Source-linked signals are re-checked annually; others do not expire. */
export const SIGNAL_TTL_DAYS: Partial<Record<SignalKind, number>> = {
  linkedin_oauth: 365,
  public_profile_url: 365,
};

export function isSignalExpired(signal: VerificationSignal, now = new Date()): boolean {
  if (signal.status === 'expired') return true;
  if (!signal.expiresAt) return false;
  return new Date(signal.expiresAt).getTime() <= now.getTime();
}

/**
 * Derives the tier from the signals present. The tier is NEVER set directly —
 * it is always a function of what was actually checked, so it cannot drift away
 * from the evidence, and an expiring signal automatically demotes the pathway.
 */
export function deriveTier(
  signals: readonly VerificationSignal[],
  opts: { hasAttestation: boolean },
  now = new Date(),
): VerificationTier {
  const live = signals.filter((s) => s.status === 'passed' && !isSignalExpired(s, now));

  const institutional = live.some(
    (s) =>
      s.kind === 'edu_email_domain' ||
      s.kind === 'employer_email_domain' ||
      (s.kind === 'manual_review' && s.claimRef !== 'identity'),
  );
  if (institutional) return 'institution-verified';

  const sourceLinked = live.some(
    (s) =>
      s.kind === 'linkedin_oauth' ||
      s.kind === 'public_profile_url' ||
      s.kind === 'credential_upload',
  );
  if (sourceLinked) return 'source-linked';

  if (opts.hasAttestation) return 'self-attested';
  return 'unverified';
}

/** Step ids with at least one live passing signal — drives per-claim badges. */
export function verifiedClaims(
  signals: readonly VerificationSignal[],
  now = new Date(),
): Set<string> {
  const out = new Set<string>();
  for (const s of signals) {
    if (s.status === 'passed' && !isSignalExpired(s, now)) out.add(s.claimRef);
  }
  return out;
}

/**
 * Whether a pathway may appear in the DEFAULT sort. Unverified pathways are
 * ranked lower and badged, never hidden — but anti-fabrication requires that
 * nothing reaches the default ranking without at least an attestation.
 */
export function canRankInDefaultSort(tier: VerificationTier): boolean {
  return tierRank[tier] >= tierRank['self-attested'];
}
