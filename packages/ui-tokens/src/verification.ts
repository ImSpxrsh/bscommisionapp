/**
 * Verification tier encoding.
 *
 * The tier ladder is ordinal: each rung means strictly more was checked than the
 * one below. The visual encoding is ordinal too — chroma and weight increase up
 * the ladder, so `unverified` is the visibly weakest state without being styled
 * as an error. Unverified content is ranked lower and badged clearly, but it is
 * never hidden and never dressed up to look verified.
 *
 * A tier badge always renders as icon + label + colour. Colour never carries the
 * meaning alone.
 *
 * The `meaning` strings are shown to users VERBATIM in the badge tooltip and the
 * profile verification panel. Do not paraphrase them per-surface — a tier must
 * mean exactly one thing everywhere it appears.
 */

import {
  SIGNAL_KINDS,
  VERIFICATION_TIERS,
  tierRank,
  type SignalKind,
  type VerificationTier,
} from '@precedent/core';

import { neutral, status } from './primitives.js';

/**
 * The tier ladder, its ordering, and the signal kinds are DOMAIN facts owned by
 * `@precedent/core` — they drive ranking and access decisions, not just styling.
 * This module owns only how they look.
 */
export { VERIFICATION_TIERS, SIGNAL_KINDS, tierRank };
export type { VerificationTier, SignalKind };

export type TierStyle = {
  label: string;
  /** Shown verbatim to the user. */
  meaning: string;
  /** How the tier is earned. Shown in the verification panel. */
  earnedBy: string;
  icon: string;
  fg: { light: string; dark: string };
  bg: { light: string; dark: string };
  border: { light: string; dark: string };
};

export const tierStyle: Record<VerificationTier, TierStyle> = {
  unverified: {
    label: 'Unverified',
    meaning: 'Submitted, nothing checked.',
    earnedBy: 'Default state on submission.',
    icon: 'circle-dashed',
    fg: { light: neutral[600], dark: '#94A3B8' },
    bg: { light: neutral[100], dark: '#1B2430' },
    border: { light: neutral[300], dark: '#33404F' },
  },
  'self-attested': {
    label: 'Self-attested',
    meaning: 'The author confirmed their identity to us. The content itself is unchecked.',
    earnedBy: 'A registered account plus an explicit attestation.',
    icon: 'user-check',
    fg: { light: '#5B4A08', dark: '#E3C46A' },
    bg: { light: '#FBF5E3', dark: '#2A2416' },
    border: { light: '#E5D5A3', dark: '#4A3F1F' },
  },
  'source-linked': {
    label: 'Source-linked',
    meaning: 'At least one claim in this pathway is corroborated by an external source.',
    earnedBy: 'A matching LinkedIn OAuth identity, a public profile URL, or a verifiable credential link.',
    icon: 'link',
    fg: { light: status.info.light, dark: status.info.dark },
    bg: { light: '#EAF0FE', dark: '#16233F' },
    border: { light: '#BDD0F8', dark: '#2C3E63' },
  },
  'institution-verified': {
    label: 'Institution-verified',
    meaning:
      'An institution or employer email domain was confirmed for a step claimed in this pathway.',
    earnedBy: 'A .edu or employer domain challenge, or manual review of an uploaded credential.',
    icon: 'shield-check',
    fg: { light: status.good.light, dark: status.good.dark },
    bg: { light: '#E6F5EC', dark: '#0F2A1B' },
    border: { light: '#A9DCC0', dark: '#1D4630' },
  },
};

/** Display names for each signal kind, shown in the verification panel. */
export const signalLabel: Record<SignalKind, string> = {
  linkedin_oauth: 'LinkedIn identity match',
  edu_email_domain: 'Institution email domain',
  employer_email_domain: 'Employer email domain',
  public_profile_url: 'Public profile link',
  credential_upload: 'Uploaded credential',
  manual_review: 'Manual review',
};

/**
 * Source-linked signals expire and are re-checked annually. Stored as days so
 * both the API's re-check job and the UI's "checked N ago" copy read the same
 * number from one place.
 */
export const SIGNAL_RECHECK_DAYS: Partial<Record<SignalKind, number>> = {
  linkedin_oauth: 365,
  public_profile_url: 365,
};
