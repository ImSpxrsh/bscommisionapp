/**
 * Realistic fixtures.
 *
 * These exist to exercise the model against content shaped like what real
 * submissions look like — including the parts most success stories omit. The
 * reference fixture below documents a failed first application cycle, a low
 * science GPA, and a year of remediation, because a model that only round-trips
 * a clean pathway has not been tested.
 *
 * Reused by the API seed script in `services/api`.
 */

import type { Pathway } from './pathway.js';

/**
 * Electrical engineering → dental school.
 *
 * 6.5 years, one rejected application cycle, a post-bacc recovery, and a
 * pivotal shadowing step that changed the plan.
 */
export const EE_TO_DENTAL: Pathway = {
  id: 'pw_ee_dental_001',
  transition: {
    from: { type: 'education', label: 'Electrical Engineering', normalizedId: 'electrical-engineering' },
    to: { type: 'education', label: 'Dental School', normalizedId: 'dental-school' },
    canonicalSlug: 'electrical-engineering-to-dental-school',
    transitionType: 'field-switch',
  },
  person: {
    pseudonym: 'Circuit to Crown',
    realName: 'Priya Raghunathan',
    isAnonymous: true,
    backgroundTags: ['first-generation', 'international-student'],
    graduationYear: { year: 2019, precision: 'exact' },
    locations: [{ country: 'United States', metro: 'Chicago', city: 'Evanston', precision: 'metro' }],
    visibility: { compensation: 'private', displayName: 'private' },
  },
  startingPoint: {
    institution: 'State University',
    major: 'Electrical Engineering',
    gpaBand: '3.0-3.4',
    priorExperience:
      'Three years of circuits coursework and one hardware internship. No biology past the first-year requirement, and no clinical exposure of any kind.',
    constraints: ['first-generation', 'visa-status', 'no-network', 'financial-need'],
  },
  steps: [
    {
      id: 'st_001',
      order: 0,
      startDate: '2017-09',
      endDate: '2018-05',
      ongoing: false,
      type: 'coursework',
      title: 'Finished the EE core while adding general biology',
      organization: 'State University',
      description:
        'Kept the engineering degree on track and added the two-semester biology sequence as an overload. This was the cheapest way to test whether I actually liked the material before committing to anything.',
      wasPivotal: false,
    },
    {
      id: 'st_002',
      order: 1,
      startDate: '2018-06',
      endDate: '2018-08',
      ongoing: false,
      type: 'networking',
      title: 'Shadowed a general dentist for 80 hours',
      organization: 'Private practice, Evanston',
      description:
        'Cold-emailed 31 practices and heard back from two. The 80 hours here mattered more than any course I took: it is what turned a vague interest into a decision, and it is the single thing I would tell anyone to do first.',
      wasPivotal: true,
      obstacle: {
        description:
          'I had no medical or dental contacts at all, and most practices ignore cold emails from a stranger with an engineering transcript.',
        howResolved:
          'Stopped writing generic emails. Wrote to practices within one mile of my apartment, said exactly why I was asking and that I would come in on any schedule they wanted. Two said yes within a week.',
      },
      advice: 'Shadow before you take a single prerequisite. It is free and it is the highest-information step available.',
    },
    {
      id: 'st_003',
      order: 2,
      startDate: '2018-09',
      endDate: '2019-06',
      ongoing: false,
      type: 'coursework',
      title: 'Prerequisite sequence: organic chemistry, biochemistry, anatomy',
      organization: 'State University',
      description:
        'Took the remaining prerequisites alongside senior EE design. Organic chemistry II is where my science GPA took the damage that cost me the first cycle.',
      wasPivotal: false,
      obstacle: {
        description:
          'Organic chemistry II while carrying a senior capstone was too much. I got a C+, which pulled my science GPA to roughly 3.1 — below where dental schools stop reading.',
        howResolved:
          'I did not resolve it that year. I finished the degree, then retook the course during the post-bacc below. Retaking it was the only thing that actually moved the number.',
      },
    },
    {
      id: 'st_004',
      order: 3,
      startDate: '2019-04',
      endDate: '2019-06',
      ongoing: false,
      type: 'exam',
      title: 'First DAT attempt — scored 19 AA',
      description:
        'Studied about eight weeks while finishing capstone. A 19 is below the average for accepted applicants and I knew it when the score came back.',
      wasPivotal: false,
    },
    {
      id: 'st_005',
      order: 4,
      startDate: '2019-06',
      endDate: '2020-03',
      ongoing: false,
      type: 'application',
      title: 'First application cycle — 12 schools, zero interviews',
      description:
        'Applied broadly with a 3.1 science GPA and a 19 DAT. Twelve applications, twelve rejections, no interview invitations. Roughly $2,400 in fees.',
      wasPivotal: false,
    },
    {
      id: 'st_006',
      order: 5,
      startDate: '2020-04',
      endDate: '2020-06',
      ongoing: false,
      type: 'setback',
      title: 'Rejected everywhere; took three months to decide whether to continue',
      description:
        'This is the part that gets left out of these stories. I had an engineering degree I was no longer using, a visa clock, and no acceptance. I worked as a hardware test engineer during this period and genuinely considered stopping.',
      wasPivotal: true,
      obstacle: {
        description:
          'A full rejection cycle with no interviews, plus family pressure to stay in engineering because it was the safe, visa-friendly path.',
        howResolved:
          'I asked two admissions offices what specifically disqualified me. Both gave the same answer: science GPA and DAT, in that order. That turned an identity crisis into a fixable list of two things.',
      },
      advice:
        'Ask the schools that rejected you what the disqualifier was. Most will tell you. It converts a vague failure into a concrete plan.',
    },
    {
      id: 'st_007',
      order: 6,
      startDate: '2020-07',
      endDate: '2021-05',
      ongoing: false,
      type: 'job',
      title: 'Hardware test engineer — funded the post-bacc',
      organization: 'Mid-size electronics manufacturer',
      description:
        'Took the engineering job specifically to pay for the post-bacc and to keep my visa status while reapplying. The degree I had stopped wanting turned out to be what made the second attempt affordable.',
      wasPivotal: false,
    },
    {
      id: 'st_008',
      order: 7,
      startDate: '2020-09',
      endDate: '2021-05',
      ongoing: false,
      type: 'coursework',
      title: 'Post-baccalaureate: retook organic chemistry II, added upper-level biology',
      organization: 'State University, evening program',
      description:
        'Evening classes while working full time. Retook organic chemistry II (A) and added three upper-level biology courses. Science GPA moved from roughly 3.1 to 3.45.',
      wasPivotal: true,
      evidenceUrl: 'https://example.edu/registrar/verify/postbacc-transcript',
    },
    {
      id: 'st_009',
      order: 8,
      startDate: '2021-02',
      endDate: '2021-05',
      ongoing: false,
      type: 'exam',
      title: 'Second DAT attempt — scored 23 AA',
      description:
        'Four months of structured study instead of eight rushed weeks. The difference was almost entirely in the amount of time, not the materials.',
      wasPivotal: false,
      advice: 'Do not take the DAT in the same term as a capstone or thesis. The score is worth more than the time saved.',
    },
    {
      id: 'st_010',
      order: 9,
      startDate: '2021-06',
      endDate: '2022-03',
      ongoing: false,
      type: 'application',
      title: 'Second cycle — 14 schools, 4 interviews, 2 acceptances',
      description:
        'Applied the day the cycle opened rather than three months in. Rolling admissions rewards early submission more than most applicants realize.',
      wasPivotal: false,
      advice: 'Submit in the first two weeks. With rolling admissions, the same application is worth more in June than in September.',
    },
  ],
  outcome: {
    result: 'Accepted to dental school (DMD)',
    organization: 'Midwestern dental school',
    date: '2022-03',
    compensationBand: 'prefer-not-to-say',
    isFinal: true,
  },
  reflection: {
    whatIdRepeat: [
      'Shadowing for 80 hours before taking a single prerequisite.',
      'Keeping the engineering degree instead of dropping it — it funded the reattempt and kept my visa valid.',
      'Asking the schools that rejected me what specifically disqualified my application.',
    ],
    whatIdSkip: [
      'The first application cycle. I applied knowing my numbers were below the range and it cost about $2,400 and a year.',
      'Taking organic chemistry II in the same semester as senior capstone.',
    ],
    biggestObstacle:
      'A science GPA that was below the reading threshold, which no amount of essay writing could compensate for. It took a full year of post-bacc coursework to fix, and there was no shortcut.',
    luckFactors: [
      'The second dentist I emailed happened to be an alumnus of my university and answered because of it.',
      'My employer allowed a schedule that made evening classes possible. Most would not have.',
      'My visa status held through the gap year. If it had not, none of this would have been possible.',
    ],
    costEstimate: 'Roughly $19,000 total: post-bacc tuition, two DAT attempts, and application fees across both cycles.',
  },
  verification: {
    tier: 'institution-verified',
    signals: [
      {
        kind: 'edu_email_domain',
        status: 'passed',
        checkedAt: '2022-04-02T14:20:00.000Z',
        claimRef: 'st_008',
        evidenceRef: 'obj://verifications/ee-dental-001/edu-domain',
        expiresAt: null,
      },
      {
        kind: 'linkedin_oauth',
        status: 'passed',
        checkedAt: '2022-04-02T14:18:00.000Z',
        claimRef: 'identity',
        evidenceRef: 'oauth://linkedin/subject-hash-9f2c',
        expiresAt: '2027-04-02T14:18:00.000Z',
      },
      {
        kind: 'public_profile_url',
        status: 'passed',
        checkedAt: '2022-04-02T14:25:00.000Z',
        claimRef: 'st_010',
        expiresAt: '2027-04-02T14:25:00.000Z',
      },
    ],
    lastReviewedAt: '2022-04-02T14:30:00.000Z',
    reviewerNote: 'Post-bacc transcript confirmed via registrar domain challenge.',
  },
  contact: {
    isOpen: true,
    mode: 'relay',
    topics: ['DAT retakes', 'post-bacc programs', 'reapplying after rejection', 'international student visas'],
    rateLimit: 3,
    relayAddress: 'relay+ee-dental-001@precedent.internal',
  },
  meta: {
    createdAt: '2022-04-01T09:00:00.000Z',
    updatedAt: '2024-01-14T11:32:00.000Z',
    viewCount: 4821,
    savedCount: 312,
    reportCount: 0,
  },
  attestedNoObstacles: false,
};
