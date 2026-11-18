import { addDaysUtc } from '@tvseri.es/utils';
import { PARTIAL_TTL } from '@/utils/cacheHeader';
import { logWarn } from '@/utils/logWarn';

import { setCacheItem } from './index';
import { readStoredEntry, type Stored } from './readThroughStale';
import { claim } from './singleFlight';

/**
 * Read-through for builds keyed by day (Home's feature, toy, premieres, New
 * this week and Connected by; Discover's go-deeper; the duration tiles), with two guards a plain
 * readThrough lacks at UTC midnight, when every one of them goes cold at once:
 *
 * - **One build in flight per key across Lambdas**: a reader that finds no
 *   fresh build claims `build:<key>` (singleFlight.ts, one conditional write,
 *   lapsing after BUILD_CLAIM_SECONDS); only the winner builds. Everyone else
 *   is answered at once with the previous day's build, so Home is never blank
 *   while today's is built.
 * - **Yesterday as the fallback**: when the build fails (TMDB down, a breaker
 *   open) or builds nothing storable, the previous day's build is served, and
 *   `fallback` tells the route to keep it out of the CDN for long
 *   (PARTIAL_CACHE_CONTROL). Without one, the build's error stands.
 *
 * Builds are stored as `{ freshUntil, value }` for their `ttl` plus
 * KEEP_FOR_FALLBACK, so yesterday's is still there the whole next day
 * (DynamoDB's TTL sweep is no guarantee either way). A build whose `ttl` is
 * false is returned but not stored, as with readThrough.
 */

export type DayRead<T> = Readonly<{ fallback: boolean; value: T }>;

/** Long enough for the build to finish; then another reader may try */
const BUILD_CLAIM_SECONDS = 30;
/** How long a build is kept past its own life, for the next day's fallback */
const KEEP_FOR_FALLBACK = 2 * 86_400;

export const readThroughDay = async <T>({
  day,
  key,
  load,
  ttl,
}: Readonly<{
  /** YYYY-MM-DD the build is for */
  day: string;
  /** The Cache-table key of a day's build */
  key: (day: string) => string;
  load: () => Promise<T>;
  /** Seconds a build stays fresh, or false to not store it */
  ttl: (value: T) => number | false;
}>): Promise<DayRead<T>> => {
  const todayKey = key(day);
  const today = await readStoredEntry<T>(todayKey);
  if (today && today.freshUntil > Date.now()) {
    return { fallback: false, value: today.value };
  }

  let previous: Stored<T> | undefined | null = null;
  const previousBuild = async () => {
    previous ??= await readStoredEntry<T>(key(addDaysUtc(day, -1)));
    return previous;
  };
  /** What to serve instead of a build: today's older one, else yesterday's */
  const instead = async (): Promise<DayRead<T> | undefined> => {
    if (today) {
      return { fallback: false, value: today.value };
    }
    const yesterday = await previousBuild();
    return yesterday ? { fallback: true, value: yesterday.value } : undefined;
  };

  // Someone else is building it: don't wait, don't build twice
  const mine = await claim(`build:${todayKey}`, BUILD_CLAIM_SECONDS).catch(
    (error: unknown) => {
      logWarn(`Build claim failed for ${todayKey}, building`, error);
      return true;
    },
  );
  if (!mine) {
    const served = await instead();
    if (served) {
      return served;
    }
  }

  let value: T;
  try {
    value = await load();
  } catch (error) {
    const served = await instead();
    if (served) {
      logWarn(`Build failed for ${todayKey}, serving an older one`, error);
      return served;
    }
    throw error;
  }

  const seconds = ttl(value);
  if (seconds === false) {
    return (await instead()) ?? { fallback: false, value };
  }
  try {
    await setCacheItem(
      todayKey,
      { freshUntil: Date.now() + seconds * 1000, value } satisfies Stored<T>,
      { ttl: seconds + KEEP_FOR_FALLBACK },
    );
  } catch (error) {
    logWarn(`Cache set failed for ${todayKey}`, error);
  }
  return { fallback: false, value };
};

/** Seconds a complete day build stays fresh */
export const DAY_BUILD_TTL = 86_400;

/**
 * A day build that says whether lookups failed on the way (`partial`): a
 * complete one is kept a day and an incomplete one an hour (PARTIAL_TTL),
 * so a complete one replaces it soon, unless `ttl` says otherwise. Another
 * day's build standing in is reported as partial too, which keeps it out of
 * the CDN for long.
 */
export const readDayBuild = async <T extends Readonly<{ partial: boolean }>>({
  ttl = (built) => (built.partial ? PARTIAL_TTL : DAY_BUILD_TTL),
  ...build
}: Readonly<{
  day: string;
  key: (day: string) => string;
  load: () => Promise<T>;
  ttl?: (built: T) => number | false;
}>): Promise<T> => {
  const { fallback, value } = await readThroughDay<T>({ ...build, ttl });
  return fallback ? { ...value, partial: true } : value;
};
