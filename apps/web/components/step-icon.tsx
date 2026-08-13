import {
  ArrowLeftRight,
  Award,
  Banknote,
  BookOpen,
  Briefcase,
  Building2,
  FileCheck,
  FlaskConical,
  GitFork,
  Hammer,
  MapPin,
  Send,
  TrendingDown,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { StepType } from '@precedent/core';
import { stepTypeFamily, stepTypeMeta } from '@precedent/ui-tokens';

/**
 * SVG icons only — never emoji. The icon is the within-family distinguisher:
 * seven hue families cover fourteen step types, so `coursework` and `exam` share
 * a colour and are told apart by icon and label.
 */
const ICONS: Record<StepType, LucideIcon> = {
  coursework: BookOpen,
  internship: Briefcase,
  research: FlaskConical,
  exam: FileCheck,
  certification: Award,
  job: Building2,
  transfer: ArrowLeftRight,
  application: Send,
  networking: Users,
  project: Hammer,
  setback: TrendingDown,
  pivot: GitFork,
  financial: Banknote,
  relocation: MapPin,
};

/** CSS variable holding this step type's family hue, or null for setback. */
export function stepColorVar(type: StepType): string | null {
  const family = stepTypeFamily[type];
  if (family === 'setback') return null;
  const kebab = family.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
  return `var(--step-${kebab})`;
}

export function StepIcon({ type, size = 14 }: { type: StepType; size?: number }) {
  const Icon = ICONS[type];
  return <Icon size={size} aria-hidden="true" strokeWidth={2} />;
}

export function stepLabel(type: StepType): string {
  return stepTypeMeta[type].label;
}
