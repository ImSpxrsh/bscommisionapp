/**
 * Seed data generator.
 *
 * Produces 40 pathways across 10 transitions. Generated rather than hand-written
 * so the set has real *variation* — different durations, constraint mixes,
 * verification tiers, and failure modes — which is what the faceted search and
 * the compare view actually need to be exercised against.
 *
 * Deterministic: a fixed PRNG seed means the same corpus every run, so facet
 * counts in tests are stable.
 *
 * Every generated pathway is validated against the real zod schema before it is
 * returned, so bad seed data fails loudly at build time rather than producing a
 * subtly broken index.
 */

import {
  Pathway,
  transitionSlug,
  type Constraint,
  type BackgroundTag,
  type GpaBand,
  type Pathway as PathwayType,
  type StepType,
  type TransitionType,
  type VerificationTier,
} from '@precedent/core';

/** Mulberry32 — small, fast, deterministic. */
function makeRng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = makeRng(0x9e3779b9);
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)]!;
const pickSome = <T>(arr: readonly T[], n: number): T[] => {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i += 1) {
    out.push(copy.splice(Math.floor(rng() * copy.length), 1)[0]!);
  }
  return out;
};
const int = (min: number, max: number) => min + Math.floor(rng() * (max - min + 1));

function addMonths(ym: string, months: number): string {
  const [y, m] = ym.split('-').map(Number) as [number, number];
  const total = y * 12 + (m - 1) + months;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}

type TransitionTemplate = {
  fromLabel: string;
  fromId: string;
  fromType: 'education' | 'role' | 'status';
  toLabel: string;
  toId: string;
  toType: 'education' | 'role' | 'status';
  transitionType: TransitionType;
  major: string;
  outcomes: string[];
  organizations: string[];
  /** Ordered step blueprint. */
  arc: Array<{ type: StepType; title: string; org?: string; months: number }>;
  typicalConstraints: Constraint[];
  compBands: Array<PathwayType['outcome']['compensationBand']>;
};

const TEMPLATES: TransitionTemplate[] = [
  {
    fromLabel: 'Electrical Engineering',
    fromId: 'electrical-engineering',
    fromType: 'education',
    toLabel: 'Dental School',
    toId: 'dental-school',
    toType: 'education',
    transitionType: 'field-switch',
    major: 'Electrical Engineering',
    outcomes: ['Accepted to dental school (DMD)', 'Accepted to dental school (DDS)'],
    organizations: ['Midwestern dental school', 'State dental school', 'Private dental school'],
    typicalConstraints: ['low-gpa', 'no-network', 'financial-need', 'first-generation'],
    compBands: ['prefer-not-to-say'],
    arc: [
      { type: 'coursework', title: 'Added the biology sequence alongside the EE core', org: 'State University', months: 9 },
      { type: 'networking', title: 'Shadowed a general dentist', months: 3 },
      { type: 'coursework', title: 'Prerequisite sequence: organic chemistry and biochemistry', org: 'State University', months: 10 },
      { type: 'exam', title: 'First DAT attempt', months: 3 },
      { type: 'application', title: 'First application cycle', months: 9 },
      { type: 'setback', title: 'Rejected without interviews; reassessed for three months', months: 3 },
      { type: 'coursework', title: 'Post-baccalaureate coursework to repair the science GPA', org: 'State University', months: 9 },
      { type: 'exam', title: 'Second DAT attempt', months: 4 },
      { type: 'application', title: 'Second application cycle', months: 9 },
    ],
  },
  {
    fromLabel: 'Industrial Engineering',
    fromId: 'industrial-engineering',
    fromType: 'education',
    toLabel: 'Investment Banking Analyst',
    toId: 'investment-banking-analyst',
    toType: 'role',
    transitionType: 'industry-entry',
    major: 'Industrial Engineering',
    outcomes: ['Investment banking analyst offer', 'Summer analyst converted to full time'],
    organizations: ['Bulge bracket bank', 'Middle-market bank', 'Boutique advisory firm'],
    typicalConstraints: ['non-target-school', 'no-network', 'financial-need'],
    compBands: ['100k-150k', '150k-200k'],
    arc: [
      { type: 'coursework', title: 'Self-studied accounting and valuation outside the engineering curriculum', months: 6 },
      { type: 'networking', title: 'Cold-emailed alumni for informational calls', months: 8 },
      { type: 'project', title: 'Built a DCF model portfolio to compensate for a non-finance transcript', months: 4 },
      { type: 'application', title: 'First recruiting season', months: 6 },
      { type: 'setback', title: 'Cut after first rounds at every bulge bracket', months: 2 },
      { type: 'internship', title: 'Boutique advisory internship', months: 4 },
      { type: 'networking', title: 'Converted three alumni calls into referrals', months: 5 },
      { type: 'application', title: 'Second recruiting season', months: 5 },
    ],
  },
  {
    fromLabel: 'Community College',
    fromId: 'community-college',
    fromType: 'education',
    toLabel: 'Computer Science',
    toId: 'computer-science',
    toType: 'education',
    transitionType: 'institution-jump',
    major: 'Computer Science',
    outcomes: ['Transferred to a top-25 CS program', 'Transferred to the state flagship CS program'],
    organizations: ['Top-25 university', 'State flagship university'],
    typicalConstraints: ['financial-need', 'first-generation', 'working-through-school', 'no-network'],
    compBands: ['prefer-not-to-say'],
    arc: [
      { type: 'coursework', title: 'Completed the transfer-track math and CS sequence', org: 'Community college', months: 12 },
      { type: 'job', title: 'Worked part time to cover tuition', months: 18 },
      { type: 'project', title: 'Built and shipped a portfolio project', months: 6 },
      { type: 'networking', title: 'Met with the transfer advisor every term', months: 12 },
      { type: 'application', title: 'Transfer application cycle', months: 6 },
      { type: 'setback', title: 'Waitlisted at first-choice school', months: 3 },
      { type: 'transfer', title: 'Enrolled as a junior transfer', months: 1 },
    ],
  },
  {
    fromLabel: 'Military Service',
    fromId: 'military-service',
    fromType: 'status',
    toLabel: 'Software Engineer',
    toId: 'software-engineer',
    toType: 'role',
    transitionType: 'non-traditional-entry',
    major: 'Self-taught',
    outcomes: ['Software engineer offer', 'Associate software engineer offer'],
    organizations: ['Large tech company', 'Mid-size software company', 'Defense contractor'],
    typicalConstraints: ['no-relevant-experience', 'late-start', 'no-network'],
    compBands: ['100k-150k', '150k-200k', '75k-100k'],
    arc: [
      { type: 'certification', title: 'Used tuition assistance for cloud certifications', months: 6 },
      { type: 'coursework', title: 'Worked through a structured CS curriculum after hours', months: 14 },
      { type: 'project', title: 'Shipped three open-source projects', months: 8 },
      { type: 'relocation', title: 'Relocated for a lower cost of living while job searching', months: 2 },
      { type: 'application', title: 'First application round — 120 applications', months: 5 },
      { type: 'setback', title: 'No callbacks; resume was reading as non-technical', months: 3 },
      { type: 'networking', title: 'Joined a veterans-in-tech mentorship program', months: 4 },
      { type: 'job', title: 'Started as a software engineer', months: 1 },
    ],
  },
  {
    fromLabel: 'Nursing',
    fromId: 'nursing',
    fromType: 'education',
    toLabel: 'Medical School',
    toId: 'medical-school',
    toType: 'education',
    transitionType: 'grad-school',
    major: 'Nursing',
    outcomes: ['Accepted to medical school (MD)', 'Accepted to medical school (DO)'],
    organizations: ['State medical school', 'Private medical school'],
    typicalConstraints: ['late-start', 'caregiving', 'financial-need', 'working-through-school'],
    compBands: ['prefer-not-to-say'],
    arc: [
      { type: 'job', title: 'Worked as a floor nurse while completing prerequisites', months: 24 },
      { type: 'coursework', title: 'Completed physics and organic chemistry prerequisites', months: 12 },
      { type: 'exam', title: 'MCAT preparation and first attempt', months: 6 },
      { type: 'setback', title: 'MCAT score below target range', months: 2 },
      { type: 'exam', title: 'MCAT retake', months: 5 },
      { type: 'research', title: 'Joined a clinical research project for application strength', months: 10 },
      { type: 'application', title: 'Application cycle', months: 10 },
    ],
  },
  {
    fromLabel: 'Psychology',
    fromId: 'psychology',
    fromType: 'education',
    toLabel: 'Data Scientist',
    toId: 'data-scientist',
    toType: 'role',
    transitionType: 'field-switch',
    major: 'Psychology',
    outcomes: ['Data scientist offer', 'Analytics role converted to data science'],
    organizations: ['Healthcare analytics company', 'Consumer tech company', 'Consultancy'],
    typicalConstraints: ['no-relevant-experience', 'no-network', 'non-target-school'],
    compBands: ['75k-100k', '100k-150k'],
    arc: [
      { type: 'coursework', title: 'Took statistics and programming courses as electives', months: 10 },
      { type: 'research', title: 'Ran quantitative analysis for a faculty research lab', months: 12 },
      { type: 'project', title: 'Published three analysis write-ups publicly', months: 6 },
      { type: 'application', title: 'Applied to analyst roles as an entry point', months: 4 },
      { type: 'setback', title: 'Rejected from every data science role for lacking engineering depth', months: 3 },
      { type: 'job', title: 'Took a data analyst role deliberately as a stepping stone', months: 18 },
      { type: 'pivot', title: 'Moved internally into data science', months: 2 },
    ],
  },
  {
    fromLabel: 'Mechanical Engineering',
    fromId: 'mechanical-engineering',
    fromType: 'education',
    toLabel: 'Product Manager',
    toId: 'product-manager',
    toType: 'role',
    transitionType: 'industry-entry',
    major: 'Mechanical Engineering',
    outcomes: ['Associate product manager offer', 'Product manager offer'],
    organizations: ['Large tech company', 'Hardware startup', 'Enterprise software company'],
    typicalConstraints: ['no-relevant-experience', 'no-network'],
    compBands: ['100k-150k', '150k-200k'],
    arc: [
      { type: 'internship', title: 'Mechanical design internship', months: 3 },
      { type: 'job', title: 'Worked as a design engineer', months: 20 },
      { type: 'project', title: 'Led a cross-functional product launch as the engineering lead', months: 8 },
      { type: 'networking', title: 'Built relationships with the product organization internally', months: 6 },
      { type: 'application', title: 'Applied to APM programs externally', months: 5 },
      { type: 'setback', title: 'Rejected from every external APM program', months: 2 },
      { type: 'pivot', title: 'Moved internally into an associate product role', months: 2 },
    ],
  },
  {
    fromLabel: 'Business Administration',
    fromId: 'business-administration',
    fromType: 'education',
    toLabel: 'Law School',
    toId: 'law-school',
    toType: 'education',
    transitionType: 'grad-school',
    major: 'Business Administration',
    outcomes: ['Accepted to law school (JD)', 'Accepted to law school with scholarship'],
    organizations: ['T14 law school', 'State law school', 'Regional law school'],
    typicalConstraints: ['financial-need', 'first-generation'],
    compBands: ['prefer-not-to-say'],
    arc: [
      { type: 'coursework', title: 'Took constitutional law and legal writing electives', months: 8 },
      { type: 'exam', title: 'First LSAT attempt', months: 5 },
      { type: 'setback', title: 'LSAT score well below the target school range', months: 2 },
      { type: 'exam', title: 'LSAT retake after a full study reset', months: 6 },
      { type: 'job', title: 'Worked as a paralegal to confirm the decision', months: 14 },
      { type: 'application', title: 'Application cycle', months: 8 },
    ],
  },
  {
    fromLabel: 'Teacher',
    fromId: 'teacher',
    fromType: 'role',
    toLabel: 'Software Engineer',
    toId: 'software-engineer',
    toType: 'role',
    transitionType: 'career-restart',
    major: 'Education',
    outcomes: ['Software engineer offer', 'Junior developer offer'],
    organizations: ['Education technology company', 'Mid-size software company'],
    typicalConstraints: ['late-start', 'financial-need', 'no-relevant-experience', 'caregiving'],
    compBands: ['75k-100k', '100k-150k'],
    arc: [
      { type: 'coursework', title: 'Studied programming during evenings and summers', months: 16 },
      { type: 'financial', title: 'Saved a nine-month runway before leaving teaching', months: 12 },
      { type: 'project', title: 'Built classroom tools that real teachers used', months: 10 },
      { type: 'setback', title: 'Left teaching before securing a role; four months without income', months: 4 },
      { type: 'networking', title: 'Found an education technology community that led to referrals', months: 3 },
      { type: 'application', title: 'Applied to education technology companies specifically', months: 4 },
      { type: 'job', title: 'Started as a software engineer', months: 1 },
    ],
  },
  {
    fromLabel: 'Chemistry',
    fromId: 'chemistry',
    fromType: 'education',
    toLabel: 'Management Consultant',
    toId: 'management-consultant',
    toType: 'role',
    transitionType: 'industry-entry',
    major: 'Chemistry',
    outcomes: ['Management consultant offer', 'Associate consultant offer'],
    organizations: ['Global consultancy', 'Boutique strategy firm', 'Big four advisory'],
    typicalConstraints: ['non-target-school', 'no-network', 'visa-status'],
    compBands: ['100k-150k', '150k-200k'],
    arc: [
      { type: 'research', title: 'Ran an undergraduate research group', months: 14 },
      { type: 'networking', title: 'Attended consulting information sessions and coffee chats', months: 6 },
      { type: 'project', title: 'Completed 40 practice cases with a partner', months: 5 },
      { type: 'application', title: 'First recruiting cycle', months: 4 },
      { type: 'setback', title: 'Rejected at final round at two firms', months: 2 },
      { type: 'internship', title: 'Summer internship at a boutique firm', months: 3 },
      { type: 'application', title: 'Second recruiting cycle', months: 4 },
    ],
  },
];

const PSEUDONYMS = [
  'Northbound', 'Second Attempt', 'Long Way Round', 'Late Bloomer', 'Course Correction',
  'Third Time', 'Quiet Pivot', 'Detour', 'Night Shift', 'Slow Burn', 'Backroads',
  'Recalculating', 'Off Script', 'The Long Game', 'Switchback', 'Open Door',
  'Two Degrees', 'Uphill', 'Patchwork', 'Crosswind', 'Groundwork', 'Sidestep',
  'Rebuild', 'Fresh Start', 'Compass', 'Threshold', 'Undercurrent', 'Waypoint',
  'Foothold', 'Second Wind', 'Bridgework', 'Tailwind', 'Homecoming', 'Overhaul',
  'Clean Slate', 'Reentry', 'Milepost', 'Trailhead', 'Ascent', 'Crossing',
];

const GPA_BANDS: GpaBand[] = ['below-2.5', '2.5-2.9', '3.0-3.4', '3.5-3.7', '3.8-4.0'];
const TIERS: VerificationTier[] = [
  'unverified', 'self-attested', 'source-linked', 'source-linked',
  'institution-verified', 'institution-verified',
];
const BG_TAGS: BackgroundTag[] = [
  'first-generation', 'international-student', 'transfer-student', 'veteran',
  'career-changer', 'parent-caregiver', 'low-income', 'rural', 'returning-student', 'self-taught',
];
const LOCATIONS = [
  { country: 'United States', metro: 'Chicago', city: 'Evanston', precision: 'metro' as const },
  { country: 'United States', metro: 'New York', city: 'Brooklyn', precision: 'metro' as const },
  { country: 'United States', metro: 'Austin', city: 'Austin', precision: 'city' as const },
  { country: 'United States', metro: 'Seattle', city: 'Bellevue', precision: 'metro' as const },
  { country: 'United States', metro: 'Atlanta', city: 'Atlanta', precision: 'metro' as const },
  { country: 'Canada', metro: 'Toronto', city: 'Toronto', precision: 'metro' as const },
  { country: 'United Kingdom', metro: 'London', city: 'London', precision: 'country' as const },
];
const INSTITUTIONS = [
  'State University', 'Community College', 'Non-target University',
  'Regional Public University', 'Large State School',
];

const OBSTACLES: Record<string, { description: string; howResolved: string }> = {
  setback: {
    description: 'The plan stalled here, and it was not obvious it would recover.',
    howResolved:
      'Asked the people who rejected me what the specific disqualifier was, then fixed exactly that instead of everything at once.',
  },
  application: {
    description: 'Applied broadly without understanding what the reviewers actually screened on.',
    howResolved: 'Narrowed the list and applied early in the cycle rather than late.',
  },
  coursework: {
    description: 'Took too heavy a load and the grades showed it.',
    howResolved: 'Retook the course that mattered most rather than trying to offset it elsewhere.',
  },
  networking: {
    description: 'No existing contacts in the field, and cold outreach mostly went unanswered.',
    howResolved: 'Stopped sending generic messages and wrote to a much smaller, more specific list.',
  },
  financial: {
    description: 'Could not afford to stop earning during the transition.',
    howResolved: 'Kept working and extended the timeline instead of taking on debt.',
  },
};

function buildPathway(template: TransitionTemplate, variant: number): PathwayType {
  const id = `pw_${template.fromId}_${template.toId}_${variant}`.replace(/-/g, '_');
  const startYear = int(2014, 2020);
  let cursor = `${startYear}-${String(int(1, 9)).padStart(2, '0')}`;

  // Vary the arc: drop a step or two on some variants so durations differ.
  const arc = template.arc.filter(() => rng() > 0.12);
  const usedArc = arc.length >= 3 ? arc : template.arc;

  const steps = usedArc.map((blueprint, i) => {
    const months = Math.max(1, blueprint.months + int(-2, 3));
    const startDate = cursor;
    const endDate = addMonths(cursor, months);
    cursor = endDate;

    const wantsObstacle =
      blueprint.type === 'setback' || (rng() > 0.68 && OBSTACLES[blueprint.type]);
    const obstacle = wantsObstacle
      ? OBSTACLES[blueprint.type] ?? OBSTACLES.setback!
      : undefined;

    return {
      id: `${id}_st${String(i + 1).padStart(2, '0')}`,
      order: i,
      startDate,
      endDate,
      ongoing: false,
      type: blueprint.type,
      title: blueprint.title,
      organization: blueprint.org,
      description:
        rng() > 0.25
          ? `${blueprint.title}. This took ${months} months and was ${
              rng() > 0.5 ? 'harder' : 'slower'
            } than expected.`
          : undefined,
      wasPivotal: blueprint.type === 'pivot' || blueprint.type === 'setback' || rng() > 0.82,
      obstacle,
      evidenceUrl: rng() > 0.72 ? 'https://example.org/evidence/public-record' : undefined,
      advice: rng() > 0.7 ? 'Start this earlier than feels necessary.' : undefined,
    };
  });

  const outcomeDate = addMonths(cursor, int(0, 2));
  const tier = pick(TIERS);
  const isAnonymous = rng() > 0.55;
  const constraints = pickSome(template.typicalConstraints, int(1, 3));
  const gradYear = startYear + int(0, 4);

  const signals =
    tier === 'unverified'
      ? []
      : [
          ...(tier === 'institution-verified'
            ? [
                {
                  kind: 'edu_email_domain' as const,
                  status: 'passed' as const,
                  checkedAt: `${gradYear + 2}-05-14T10:00:00.000Z`,
                  claimRef: steps[0]!.id,
                  expiresAt: null,
                },
              ]
            : []),
          ...(tier === 'source-linked' || tier === 'institution-verified'
            ? [
                {
                  kind: 'linkedin_oauth' as const,
                  status: 'passed' as const,
                  checkedAt: `${gradYear + 2}-05-14T10:02:00.000Z`,
                  claimRef: 'identity',
                  expiresAt: `${gradYear + 7}-05-14T10:02:00.000Z`,
                },
              ]
            : []),
        ];

  const contactable = rng() > 0.45;

  const pathway: PathwayType = {
    id,
    transition: {
      from: { type: template.fromType, label: template.fromLabel, normalizedId: template.fromId },
      to: { type: template.toType, label: template.toLabel, normalizedId: template.toId },
      canonicalSlug: transitionSlug(template.fromLabel, template.toLabel),
      transitionType: template.transitionType,
    },
    person: {
      pseudonym: PSEUDONYMS[(variant * 7 + TEMPLATES.indexOf(template) * 3) % PSEUDONYMS.length]!,
      displayName: isAnonymous ? undefined : `Submitter ${variant + 1}`,
      realName: `Real Name ${TEMPLATES.indexOf(template)}-${variant}`,
      isAnonymous,
      backgroundTags: pickSome(BG_TAGS, int(0, 2)),
      graduationYear: { year: gradYear, precision: rng() > 0.7 ? 'band' : 'exact' },
      locations: [pick(LOCATIONS)],
      visibility: rng() > 0.6 ? { compensation: 'public' } : { compensation: 'private' },
    },
    startingPoint: {
      institution: pick(INSTITUTIONS),
      major: template.major,
      gpaBand: pick(GPA_BANDS),
      priorExperience: rng() > 0.4 ? 'Limited exposure to the destination field at the start.' : undefined,
      constraints,
    },
    steps,
    outcome: {
      result: pick(template.outcomes),
      organization: pick(template.organizations),
      date: outcomeDate,
      compensationBand: pick(template.compBands),
      isFinal: rng() > 0.15,
    },
    reflection: {
      whatIdRepeat: ['Starting the outreach earlier than felt comfortable.'],
      whatIdSkip: ['The first application cycle, which I entered underprepared.'],
      biggestObstacle:
        constraints.includes('no-network')
          ? 'Having no contacts in the field, which made every early step slower than it needed to be.'
          : 'Underestimating how long the prerequisite work would take alongside everything else.',
      luckFactors: ['One person answered a cold email who did not have to.'],
      costEstimate: rng() > 0.5 ? `Roughly $${int(3, 30)},000 across the whole transition.` : undefined,
    },
    verification: {
      tier,
      signals,
      lastReviewedAt: tier === 'unverified' ? null : `${gradYear + 2}-05-14T10:05:00.000Z`,
    },
    contact: {
      isOpen: contactable,
      mode: contactable ? 'relay' : 'none',
      topics: contactable ? pickSome(['timelines', 'exams', 'applications', 'funding', 'reapplying'], 2) : [],
      rateLimit: 3,
      relayAddress: contactable ? `relay+${id}@precedent.internal` : undefined,
    },
    meta: {
      createdAt: `${gradYear + 2}-03-0${int(1, 9)}T09:00:00.000Z`,
      updatedAt: `${gradYear + 2 + int(0, 2)}-06-1${int(0, 9)}T09:00:00.000Z`,
      // Deliberately varied, and deliberately NOT a ranking input.
      viewCount: int(20, 9000),
      savedCount: int(0, 400),
      reportCount: rng() > 0.95 ? 1 : 0,
    },
    attestedNoObstacles: false,
  };

  // A pathway with no recorded friction must carry the explicit attestation, or
  // the model would mark it incomplete. Some variants genuinely have none.
  const hasFriction = pathway.steps.some((s) => s.obstacle || s.type === 'setback');
  if (!hasFriction) pathway.attestedNoObstacles = true;

  // Validate against the real schema — bad seed data fails loudly here.
  return Pathway.parse(pathway);
}

/** 40 pathways: 4 variants across each of the 10 transitions. */
export function generateSeedPathways(): PathwayType[] {
  const out: PathwayType[] = [];
  for (const template of TEMPLATES) {
    for (let v = 0; v < 4; v += 1) out.push(buildPathway(template, v));
  }
  return out;
}

export const SEED_TRANSITION_COUNT = TEMPLATES.length;
