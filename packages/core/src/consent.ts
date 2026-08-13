/**
 * Age gating and parental consent.
 *
 * Product decision: browsing is open to everyone; submitting a personal pathway
 * is gated. Submitters aged 16–17 may publish only with verified parental
 * consent. Under 16 cannot submit at all.
 *
 * Detailed biographies of minors are exactly the kind of data that must not be
 * collected casually, so the gate is enforced in shared domain code and the
 * consent record is durable and revocable.
 */

import { z } from 'zod';

export const MINIMUM_SUBMISSION_AGE = 16;
export const ADULT_AGE = 18;

export const ConsentStatus = z.enum(['not-required', 'pending', 'granted', 'revoked', 'expired']);
export type ConsentStatus = z.infer<typeof ConsentStatus>;

export const ParentalConsent = z.object({
  status: ConsentStatus,
  /** Hashed contact for the consenting adult. Never stored or shown in the clear. */
  guardianContactHash: z.string().optional(),
  grantedAt: z.string().datetime().nullable().default(null),
  revokedAt: z.string().datetime().nullable().default(null),
  /** Audit reference for the consent artifact. */
  evidenceRef: z.string().optional(),
});
export type ParentalConsent = z.infer<typeof ParentalConsent>;

export type SubmissionGate =
  | { allowed: true; requiresParentalConsent: boolean }
  | { allowed: false; reason: string; requiresParentalConsent: boolean };

/**
 * Decides whether an account may publish a personal pathway.
 *
 * Browsing never calls this — reading the index is open to all ages.
 */
export function canSubmitPathway(input: {
  age: number;
  parentalConsent?: ParentalConsent;
}): SubmissionGate {
  const { age, parentalConsent } = input;

  if (age >= ADULT_AGE) {
    return { allowed: true, requiresParentalConsent: false };
  }

  if (age < MINIMUM_SUBMISSION_AGE) {
    return {
      allowed: false,
      requiresParentalConsent: false,
      reason:
        'Submitting a pathway is available from age 16. You can search and read Precedent at any age.',
    };
  }

  if (parentalConsent?.status === 'granted') {
    return { allowed: true, requiresParentalConsent: true };
  }

  const reason =
    parentalConsent?.status === 'revoked'
      ? 'Parental consent for this account was withdrawn, so the pathway cannot be published.'
      : 'Submitters aged 16 or 17 need verified parental consent before a pathway can be published.';

  return { allowed: false, requiresParentalConsent: true, reason };
}

/**
 * Withdrawn consent unpublishes immediately. A 16–17 pathway is only publicly
 * visible while consent is actively granted — it does not survive revocation.
 */
export function isPubliclyVisibleUnderConsent(input: {
  authorAge: number;
  parentalConsent?: ParentalConsent;
}): boolean {
  if (input.authorAge >= ADULT_AGE) return true;
  return input.parentalConsent?.status === 'granted';
}
