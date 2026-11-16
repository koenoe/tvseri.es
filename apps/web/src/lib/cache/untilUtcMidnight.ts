import { CACHE_LIFE } from '@tvseri.es/constants';

const DAY_SECONDS = 86_400;

/**
 * Shortest client life Next keeps in the static shell (`stale` ≥ 5 minutes,
 * cacheLife "Prerendering behavior"): the `unavailable` profile's `maxAge`
 */
const MIN_PRERENDER_SECONDS = CACHE_LIFE.unavailable.maxAge;

/**
 * The longest a day-named entry stays fresh, however far midnight is. A page
 * that reuses a cached entry takes the entry's whole `revalidate` as its own
 * life from the moment it is (re)generated, not what is left of it: an
 * entry made at 00:30 (fresh for 23.5 h) reused by a regeneration at 16:00
 * kept the page, and yesterday's day with its moments, until 15:30 the next
 * day. Capped, the page names the right day at most 15 minutes after
 * midnight (`dayLateness` in the test).
 */
export const MAX_DAY_REVALIDATE_SECONDS = 15 * 60;

/** Seconds from a moment to the next UTC midnight (a full day at midnight) */
export function secondsUntilNextUtcDay(now: Date): number {
  const elapsed = Math.floor((now.getTime() % (DAY_SECONDS * 1000)) / 1000);
  return DAY_SECONDS - elapsed;
}

/**
 * The one cache life that isn't a `CACHE_LIFE` profile: content whose copy
 * names the UTC day (Home's "of the day" moments, "Top Picks for November").
 * A fixed profile can't express it: `short` (24 h) would show yesterday's
 * moments for up to a day. So it is fresh until the next UTC midnight, but
 * never longer than `MAX_DAY_REVALIDATE_SECONDS` (at least the 5-minute
 * prerender floor, so it stays in the static shell); the client may reuse
 * it until midnight; past its life it is served stale while it regenerates
 * (for up to a day, like `short`), so a visit never waits on a render. The
 * page regenerates every 15 minutes at most, from cached sections.
 *
 * @example cacheLife(untilUtcMidnight(new Date()))
 */
export function untilUtcMidnight(now: Date) {
  const fresh = Math.max(MIN_PRERENDER_SECONDS, secondsUntilNextUtcDay(now));
  return {
    expire: fresh + CACHE_LIFE.short.sMaxAge,
    revalidate: Math.min(fresh, MAX_DAY_REVALIDATE_SECONDS),
    stale: fresh,
  } as const;
}
