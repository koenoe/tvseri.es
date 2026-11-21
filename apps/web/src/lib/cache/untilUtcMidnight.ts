import { CACHE_LIFE } from '@tvseri.es/constants';

const DAY_SECONDS = 86_400;

/**
 * Shortest client life Next keeps in the static shell (`stale` ≥ 5 minutes,
 * cacheLife "Prerendering behavior"): the `unavailable` profile's `maxAge`
 */
const MIN_PRERENDER_SECONDS = CACHE_LIFE.unavailable.maxAge;

/**
 * How long after midnight a page may still name the day before. A page that
 * reuses a cached entry takes the entry's whole `revalidate` as its own life
 * from the moment it is (re)generated, not what is left of it: an entry made
 * at 00:30 and fresh until midnight (23.5 h), reused by a regeneration at
 * 16:00, would keep the page, and yesterday's day with its moments, until
 * 15:30 the next day (`dayLateness` in the test).
 */
export const MAX_DAY_LATENESS_SECONDS = 15 * 60;

/** Seconds from a moment to the next UTC midnight (a full day at midnight) */
export function secondsUntilNextUtcDay(now: Date): number {
  const elapsed = Math.floor((now.getTime() % (DAY_SECONDS * 1000)) / 1000);
  return DAY_SECONDS - elapsed;
}

/**
 * The one cache life that isn't a `CACHE_LIFE` profile: content whose copy
 * names the UTC day (Home's "of the day" moments, "Top Picks for November").
 * A fixed profile can't express it: `short` (24 h) would show yesterday's
 * moments for up to a day.
 *
 * `revalidate` is half the way to 15 minutes past midnight: a page reusing
 * the entry as late as its last fresh second lives at most until
 * `made + 2 × revalidate`, 15 minutes past midnight, and each regeneration
 * halves the time left, so a page with steady visits regenerates about 8
 * times a day. A flat 15-minute cap kept the same bound at 96 a day. The
 * client may reuse it until midnight (at least the 5-minute prerender floor,
 * so it stays in the static shell); past its life it is served stale while it
 * regenerates (for up to a day, like `short`), so a visit never waits on a
 * render.
 *
 * @example cacheLife(untilUtcMidnight(new Date()))
 */
export function untilUtcMidnight(now: Date) {
  const untilMidnight = secondsUntilNextUtcDay(now);
  const fresh = Math.max(MIN_PRERENDER_SECONDS, untilMidnight);
  return {
    expire: fresh + CACHE_LIFE.short.sMaxAge,
    revalidate: Math.floor((untilMidnight + MAX_DAY_LATENESS_SECONDS) / 2),
    stale: fresh,
  } as const;
}
