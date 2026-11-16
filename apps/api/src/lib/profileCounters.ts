import {
  addToCounter,
  getCounter,
  replaceCounter,
  setCounter,
} from '@/lib/db/cache';
import { getAllWatched, getWatchedCount } from '@/lib/db/watched';
import { countsInStats } from '@/lib/stats/regular';

/**
 * All-time profile counters in the Cache table, kept up to date with atomic
 * deltas by the watched stream subscriber (lambdas/watched.ts). When a counter
 * is missing, the API computes it once and seeds it.
 *
 * Both are permanent. A delta that races the seeding read, a retried stream
 * batch or a MODIFY that changed a runtime can make them drift; the nightly
 * job recomputes both from the read it already does and corrects them
 * (`healWatchedCounters`). A count item that still carries an `expiresAt`
 * expires once and is seeded permanent.
 */
// The runtime is a Number (atomic ADD) of regular episodes only: specials
// stay out of stats.
const watchedRuntimeCacheKey = (userId: string) =>
  `profile:${userId}:watched-runtime:v3`;
const watchedCountCacheKey = (userId: string) =>
  `profile:${userId}:watched-count`;

/**
 * Applies per-user deltas to existing counters, one atomic update per user, in
 * parallel. A missing counter is left alone: the API computes it fresh on
 * the next request.
 */
const applyCounterDeltas = async (
  deltas: ReadonlyMap<string, number>,
  cacheKey: (userId: string) => string,
  label: string,
) => {
  await Promise.all(
    Array.from(deltas)
      .filter(([, delta]) => delta !== 0)
      .map(async ([userId, delta]) => {
        const applied = await addToCounter(cacheKey(userId), delta);
        if (applied) {
          console.log(`[CACHE] Added ${delta} to ${label} for ${userId}`);
        }
      }),
  );
};

export const applyWatchedCounterDeltas = async ({
  countDeltas,
  runtimeDeltas,
}: Readonly<{
  countDeltas: ReadonlyMap<string, number>;
  runtimeDeltas: ReadonlyMap<string, number>;
}>) => {
  await Promise.all([
    applyCounterDeltas(runtimeDeltas, watchedRuntimeCacheKey, 'runtime'),
    applyCounterDeltas(countDeltas, watchedCountCacheKey, 'count'),
  ]);
};

/**
 * All-time watched regular episode count. Reads the counter, and falls back
 * to a full COUNT (seeding the permanent counter) when it's missing, or an
 * old daily one that expired.
 */
export const getAllTimeWatchedCount = async (userId: string) => {
  const key = watchedCountCacheKey(userId);
  const cached = await getCounter(key);

  if (cached !== undefined && cached >= 0) {
    return cached;
  }

  const count = await getWatchedCount({ userId });
  await setCounter(key, count, { ttl: null });

  return count;
};

/**
 * All-time watched runtime of regular episodes. Reads the permanent counter,
 * and recomputes it from every watched item when it's missing, negative, or
 * zero while the user has watched episodes.
 */
export const getAllTimeWatchedRuntime = async (userId: string) => {
  const key = watchedRuntimeCacheKey(userId);
  const cached = await getCounter(key);

  if (cached !== undefined && cached > 0) {
    return cached;
  }
  if (cached === 0 && (await getAllTimeWatchedCount(userId)) === 0) {
    return 0;
  }

  // Only the runtimes and seasons are needed (ProjectionExpression)
  const items = await getAllWatched({
    attributes: ['runtime', 'seasonNumber'],
    userId,
  });
  const runtime = items
    .filter(countsInStats)
    .reduce((sum, item) => sum + (item.runtime || 0), 0);
  await setCounter(key, runtime, { ttl: null });

  return runtime;
};

type Counters = Readonly<{
  count: number | undefined;
  runtime: number | undefined;
}>;

/** Both counters as stored (undefined: missing, or expired), for the heal */
export const readWatchedCounters = async (
  userId: string,
): Promise<Counters> => {
  const [count, runtime] = await Promise.all([
    getCounter(watchedCountCacheKey(userId)),
    getCounter(watchedRuntimeCacheKey(userId)),
  ]);
  return { count, runtime };
};

/**
 * The nightly heal: `read` is what the counters held before the job read the
 * user's watched items, `actual` what those items add up to (regular
 * episodes). A counter that differs is replaced only if it still holds what
 * was read, so a mark's delta that landed meanwhile wins (the next night
 * looks again). A missing counter is left for the read path to seed. Each
 * correction is logged with its before and after.
 */
export const healWatchedCounters = async (
  userId: string,
  read: Counters,
  actual: Readonly<{ count: number; runtime: number }>,
) => {
  const heal = async (
    label: 'count' | 'runtime',
    key: string,
    before: number | undefined,
    after: number,
  ) => {
    if (before === undefined || before === after) {
      return;
    }
    const applied = await replaceCounter(key, before, after);
    console.log(
      applied
        ? `[COUNTER] ${userId} | ${label} ${before} -> ${after}`
        : `[COUNTER] ${userId} | ${label} ${before} -> ${after} skipped: a mark changed it meanwhile`,
    );
  };
  await Promise.all([
    heal('count', watchedCountCacheKey(userId), read.count, actual.count),
    heal(
      'runtime',
      watchedRuntimeCacheKey(userId),
      read.runtime,
      actual.runtime,
    ),
  ]);
};
