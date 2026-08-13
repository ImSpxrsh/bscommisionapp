import { CircleDashed, Link2, ShieldCheck, UserCheck } from 'lucide-react';
import type { VerificationTier } from '@precedent/core';
import { tierStyle } from '@precedent/ui-tokens';

/**
 * Verification badge.
 *
 * Always icon + label + colour — colour never carries the meaning alone, which
 * matters both for colour vision deficiency and because "green" means nothing
 * to a first-time visitor. The `title` carries the tier's meaning VERBATIM from
 * the token layer, so a tier says the same thing on every surface.
 */

const ICONS: Record<VerificationTier, typeof ShieldCheck> = {
  unverified: CircleDashed,
  'self-attested': UserCheck,
  'source-linked': Link2,
  'institution-verified': ShieldCheck,
};

const SIZES = {
  sm: 'text-2xs px-1.5 py-0.5 gap-1',
  md: 'text-xs px-2 py-1 gap-1.5',
} as const;

export function TierBadge({
  tier,
  size = 'sm',
  showLabel = true,
}: {
  tier: VerificationTier;
  size?: keyof typeof SIZES;
  showLabel?: boolean;
}) {
  const style = tierStyle[tier];
  const Icon = ICONS[tier];

  return (
    <span
      className={`inline-flex items-center rounded-sm border font-medium ${SIZES[size]}`}
      style={{
        color: `var(--tier-${tier}-fg)`,
        background: `var(--tier-${tier}-bg)`,
        borderColor: `var(--tier-${tier}-border)`,
      }}
      title={`${style.label}: ${style.meaning}`}
    >
      <Icon size={size === 'sm' ? 11 : 13} aria-hidden="true" strokeWidth={2.25} />
      {showLabel && <span>{style.label}</span>}
      {/* Screen readers get the full meaning, not just the tier name. */}
      <span className="sr-only">. {style.meaning}</span>
    </span>
  );
}
