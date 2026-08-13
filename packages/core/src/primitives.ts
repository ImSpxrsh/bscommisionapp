/**
 * Shared domain primitives: dates, bands, ids, slugs.
 *
 * Everything here is pure — no I/O, no platform APIs — so web, mobile, and the
 * API share one implementation. A bug that can happen on one platform and not
 * the other means the logic escaped this package.
 */

import { z } from 'zod';

/**
 * Pathway dates are month-granular. Nobody remembers the day they decided to
 * switch majors, month precision is what people can honestly report, and it
 * meaningfully reduces the re-identification surface of a biography.
 */
export const YearMonth = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Expected YYYY-MM');

export type YearMonth = z.infer<typeof YearMonth>;

/** Months between two YYYY-MM values, inclusive of the start month. */
export function monthsBetween(start: YearMonth, end: YearMonth): number {
  const [sy, sm] = start.split('-').map(Number) as [number, number];
  const [ey, em] = end.split('-').map(Number) as [number, number];
  return (ey - sy) * 12 + (em - sm);
}

export function compareYearMonth(a: YearMonth, b: YearMonth): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** "2 yr 4 mo" — the duration chip format used on every timeline node. */
export function formatDuration(months: number): string {
  if (months <= 0) return '<1 mo';
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m} mo`;
  if (m === 0) return `${y} yr`;
  return `${y} yr ${m} mo`;
}

/**
 * GPA is banded, never exact. An exact GPA is both a re-identification vector
 * and false precision — the useful signal is "was this person academically
 * borderline or not".
 */
export const GpaBand = z.enum([
  'below-2.5',
  '2.5-2.9',
  '3.0-3.4',
  '3.5-3.7',
  '3.8-4.0',
]);
export type GpaBand = z.infer<typeof GpaBand>;

/**
 * Compensation is ALWAYS a band and never an exact figure — this is a hard
 * product rule, not a default. It cuts the doxxing surface and keeps submitters
 * clear of employer pay-disclosure clauses.
 */
export const CompensationBand = z.enum([
  'unpaid',
  'under-50k',
  '50k-75k',
  '75k-100k',
  '100k-150k',
  '150k-200k',
  '200k-300k',
  'over-300k',
  'prefer-not-to-say',
]);
export type CompensationBand = z.infer<typeof CompensationBand>;

export const compensationBandLabel: Record<CompensationBand, string> = {
  unpaid: 'Unpaid',
  'under-50k': 'Under $50k',
  '50k-75k': '$50k–$75k',
  '75k-100k': '$75k–$100k',
  '100k-150k': '$100k–$150k',
  '150k-200k': '$150k–$200k',
  '200k-300k': '$200k–$300k',
  'over-300k': 'Over $300k',
  'prefer-not-to-say': 'Not shared',
};

/** Location precision is chosen by the submitter, per pathway. */
export const LocationPrecision = z.enum(['city', 'metro', 'country']);
export type LocationPrecision = z.infer<typeof LocationPrecision>;

export const Location = z.object({
  country: z.string().min(2),
  metro: z.string().optional(),
  city: z.string().optional(),
  precision: LocationPrecision,
});
export type Location = z.infer<typeof Location>;

/**
 * Renders a location at exactly the precision the submitter allowed. The API
 * uses this before serialization so a narrower precision is never merely hidden
 * by the client.
 */
export function formatLocation(loc: Location): string {
  if (loc.precision === 'country') return loc.country;

  const parts =
    loc.precision === 'metro'
      ? [loc.metro, loc.country]
      : [loc.city, loc.metro, loc.country];

  // A city and its metro are frequently the same string ("Austin, Austin, US").
  // De-duplicate case-insensitively rather than rendering the repeat.
  const seen = new Set<string>();
  return parts
    .filter((p): p is string => Boolean(p))
    .filter((p) => {
      const key = p.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(', ');
}

/** Graduation year may be exact or banded, submitter's choice. */
export const YearPrecision = z.enum(['exact', 'band']);
export type YearPrecision = z.infer<typeof YearPrecision>;

export const GraduationYear = z.object({
  year: z.number().int().min(1950).max(2100),
  precision: YearPrecision,
});
export type GraduationYear = z.infer<typeof GraduationYear>;

/** A banded year renders as its 3-year bucket, e.g. 2019 → "2018–2020". */
export function formatGraduationYear(g: GraduationYear): string {
  if (g.precision === 'exact') return String(g.year);
  const start = Math.floor(g.year / 3) * 3;
  return `${start}–${start + 2}`;
}

export const Id = z.string().min(1);

/** URL-safe slug. Used for canonical transition slugs and taxonomy node ids. */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
}
