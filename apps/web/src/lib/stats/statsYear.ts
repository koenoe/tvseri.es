/**
 * Which years have a Stats page: four digits, 2000 (imports can backdate
 * watches) to next year (time zones ahead of the server's). Anything else is
 * a 404, so arbitrary values never become their own cache entry. Shared by
 * the page's year rule and the static 404 rewrite for other years
 * (`lib/routing/profileNotFound`, loaded by next.config.ts: no `@/` imports
 * here).
 */
export const FIRST_STATS_YEAR = 2000;

/**
 * Next year in UTC. Read at module scope (Cache Components rejects reading
 * the clock in a prerender), so it is fixed per server process, and per
 * build for the rewrite.
 */
export const nextUtcYear = (now: Date = new Date()): number =>
  now.getUTCFullYear() + 1;

// Module scope, not render: Cache Components rejects reading the clock in a
// prerender. Next year is allowed for time zones ahead of the server's.
const NEXT_YEAR = nextUtcYear();

/**
 * The page's and the card's one year rule: four digits from 2000 to next
 * year, else null (a 404).
 */
export function parseStatsYear(
  param: string,
  lastYear: number = NEXT_YEAR,
): number | null {
  if (!/^\d{4}$/.test(param)) {
    return null;
  }
  const year = Number(param);
  return year >= FIRST_STATS_YEAR && year <= lastYear ? year : null;
}

/** The newest year with a page; the build seed is the one before this one */
export const LAST_STATS_YEAR = NEXT_YEAR;

/** A year in progress reads "2026 so far" and has no share card */
export type YearState = 'finished' | 'current' | 'future';

export function yearState(year: number, now: Date): YearState {
  const current = now.getUTCFullYear();
  if (year < current) {
    return 'finished';
  }
  return year === current ? 'current' : 'future';
}
