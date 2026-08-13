/**
 * Seed taxonomy.
 *
 * Curated starter set covering the seeded transitions, with `sourceRef` pointing
 * at the freely-licensed public dataset each node comes from (CIP codes from
 * NCES, SOC codes from the US Dept. of Labor, IPEDS for institutions). The full
 * datasets are ingested by `services/api` at deploy time; this set exists so the
 * package is testable and the app is usable without a database.
 *
 * `synonyms` is the part that actually earns its keep — it is what makes "EE",
 * "ECE", and "Electrical & Computer Engineering" collapse into one facet.
 */

import type { TaxonomyNode } from './types.js';

const node = (n: Omit<TaxonomyNode, 'canonical'> & { canonical?: boolean }): TaxonomyNode => ({
  canonical: true,
  ...n,
});

export const SEED_MAJORS: TaxonomyNode[] = [
  node({
    id: 'electrical-engineering',
    kind: 'major',
    type: 'education',
    label: 'Electrical Engineering',
    source: 'cip',
    sourceRef: '14.1001',
    synonyms: ['ee', 'ece', 'electrical and computer engineering', 'electrical engineering and computer science', 'eecs', 'electrical'],
  }),
  node({
    id: 'industrial-engineering',
    kind: 'major',
    type: 'education',
    label: 'Industrial Engineering',
    source: 'cip',
    sourceRef: '14.3501',
    synonyms: ['ie', 'industrial and systems engineering', 'ise', 'systems engineering', 'operations research'],
  }),
  node({
    id: 'computer-science',
    kind: 'major',
    type: 'education',
    label: 'Computer Science',
    source: 'cip',
    sourceRef: '11.0701',
    synonyms: ['cs', 'comp sci', 'computing', 'computer sciences'],
  }),
  node({
    id: 'mechanical-engineering',
    kind: 'major',
    type: 'education',
    label: 'Mechanical Engineering',
    source: 'cip',
    sourceRef: '14.1901',
    synonyms: ['me', 'mech e', 'mechanical'],
  }),
  node({
    id: 'nursing',
    kind: 'major',
    type: 'education',
    label: 'Nursing',
    source: 'cip',
    sourceRef: '51.3801',
    synonyms: ['bsn', 'registered nursing', 'nursing science', 'rn'],
  }),
  node({
    id: 'biology',
    kind: 'major',
    type: 'education',
    label: 'Biology',
    source: 'cip',
    sourceRef: '26.0101',
    synonyms: ['bio', 'biological sciences', 'life sciences'],
  }),
  node({
    id: 'chemistry',
    kind: 'major',
    type: 'education',
    label: 'Chemistry',
    source: 'cip',
    sourceRef: '40.0501',
    synonyms: ['chem'],
  }),
  node({
    id: 'psychology',
    kind: 'major',
    type: 'education',
    label: 'Psychology',
    source: 'cip',
    sourceRef: '42.0101',
    synonyms: ['psych'],
  }),
  node({
    id: 'business-administration',
    kind: 'major',
    type: 'education',
    label: 'Business Administration',
    source: 'cip',
    sourceRef: '52.0201',
    synonyms: ['business', 'ba', 'bba', 'management'],
  }),
  node({
    id: 'economics',
    kind: 'major',
    type: 'education',
    label: 'Economics',
    source: 'cip',
    sourceRef: '45.0601',
    synonyms: ['econ'],
  }),
  node({
    id: 'dental-school',
    kind: 'major',
    type: 'education',
    label: 'Dental School',
    source: 'cip',
    sourceRef: '51.0401',
    synonyms: ['dds', 'dmd', 'dentistry', 'doctor of dental surgery', 'doctor of dental medicine'],
  }),
  node({
    id: 'medical-school',
    kind: 'major',
    type: 'education',
    label: 'Medical School',
    source: 'cip',
    sourceRef: '51.1201',
    synonyms: ['md', 'medicine', 'doctor of medicine', 'med school'],
  }),
  node({
    id: 'law-school',
    kind: 'major',
    type: 'education',
    label: 'Law School',
    source: 'cip',
    sourceRef: '22.0101',
    synonyms: ['jd', 'juris doctor', 'law'],
  }),
  node({
    id: 'mba',
    kind: 'major',
    type: 'education',
    label: 'MBA',
    source: 'cip',
    sourceRef: '52.0201',
    synonyms: ['master of business administration', 'business school', 'b-school'],
  }),
];

export const SEED_INSTITUTIONS: TaxonomyNode[] = [
  node({
    id: 'community-college',
    kind: 'institution',
    type: 'education',
    label: 'Community College',
    source: 'curated',
    synonyms: ['cc', 'junior college', 'jc', 'two-year college', 'city college'],
  }),
  node({
    id: 'state-university',
    kind: 'institution',
    type: 'education',
    label: 'State University',
    source: 'curated',
    synonyms: ['public university', 'state school', 'state college'],
  }),
  node({
    id: 'non-target-university',
    kind: 'institution',
    type: 'education',
    label: 'Non-target University',
    source: 'curated',
    synonyms: ['non target', 'nontarget', 'non-target school'],
  }),
];

export const SEED_ROLES: TaxonomyNode[] = [
  node({
    id: 'software-engineer',
    kind: 'role',
    type: 'role',
    label: 'Software Engineer',
    source: 'onet',
    sourceRef: '15-1252.00',
    synonyms: ['swe', 'software developer', 'developer', 'programmer', 'software engineering'],
  }),
  node({
    id: 'investment-banking-analyst',
    kind: 'role',
    type: 'role',
    label: 'Investment Banking Analyst',
    source: 'onet',
    sourceRef: '13-2051.00',
    synonyms: ['ib', 'investment banking', 'ib analyst', 'banking analyst', 'ibd'],
  }),
  node({
    id: 'management-consultant',
    kind: 'role',
    type: 'role',
    label: 'Management Consultant',
    source: 'onet',
    sourceRef: '13-1111.00',
    synonyms: ['consultant', 'strategy consultant', 'consulting'],
  }),
  node({
    id: 'dentist',
    kind: 'role',
    type: 'role',
    label: 'Dentist',
    source: 'onet',
    sourceRef: '29-1021.00',
    synonyms: ['general dentist', 'dental surgeon'],
  }),
  node({
    id: 'physician',
    kind: 'role',
    type: 'role',
    label: 'Physician',
    source: 'onet',
    sourceRef: '29-1215.00',
    synonyms: ['doctor', 'md', 'medical doctor', 'resident physician'],
  }),
  node({
    id: 'registered-nurse',
    kind: 'role',
    type: 'role',
    label: 'Registered Nurse',
    source: 'onet',
    sourceRef: '29-1141.00',
    synonyms: ['rn', 'nurse', 'staff nurse'],
  }),
  node({
    id: 'product-manager',
    kind: 'role',
    type: 'role',
    label: 'Product Manager',
    source: 'onet',
    sourceRef: '11-2021.00',
    synonyms: ['pm', 'product management', 'technical product manager', 'tpm'],
  }),
  node({
    id: 'data-scientist',
    kind: 'role',
    type: 'role',
    label: 'Data Scientist',
    source: 'onet',
    sourceRef: '15-2051.00',
    synonyms: ['ds', 'data science', 'machine learning engineer', 'mle'],
  }),
  node({
    id: 'teacher',
    kind: 'role',
    type: 'role',
    label: 'Teacher',
    source: 'onet',
    sourceRef: '25-2021.00',
    synonyms: ['k-12 teacher', 'schoolteacher', 'educator'],
  }),
];

export const SEED_STATUSES: TaxonomyNode[] = [
  node({
    id: 'military-service',
    kind: 'status',
    type: 'status',
    label: 'Military Service',
    source: 'curated',
    synonyms: ['military', 'army', 'navy', 'air force', 'marines', 'active duty', 'enlisted', 'veteran'],
  }),
  node({
    id: 'caregiving',
    kind: 'status',
    type: 'status',
    label: 'Caregiving',
    source: 'curated',
    synonyms: ['stay at home parent', 'full time caregiver', 'family care'],
  }),
  node({
    id: 'self-taught',
    kind: 'status',
    type: 'status',
    label: 'Self-taught',
    source: 'curated',
    synonyms: ['self study', 'bootcamp', 'career changer', 'no degree'],
  }),
  node({
    id: 'unemployed',
    kind: 'status',
    type: 'status',
    label: 'Between roles',
    source: 'curated',
    synonyms: ['unemployed', 'laid off', 'job searching', 'career break'],
  }),
];

export const SEED_TAXONOMY: TaxonomyNode[] = [
  ...SEED_MAJORS,
  ...SEED_INSTITUTIONS,
  ...SEED_ROLES,
  ...SEED_STATUSES,
];
