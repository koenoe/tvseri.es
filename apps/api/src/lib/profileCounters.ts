import { addToCounter, getCounter, setCounter } from '@/lib/db/cache';
import { getAllWatched, getWatchedCount } from '@/lib/db/watched';

/**
 * All-time profile counters in the Cache table, kept up to date with atomic
 * deltas by the watched stream subscriber (lambdas/watched.ts). When a counter
 * is missing, the API computes it once and seeds it.
 *
 * - Runtime is permanent: it's only recomputed when missing or implausible.
 * - The episode count expires daily: a delta that races the seeding COUNT, or
 *   a retried stream batch, can double count, and the daily re-seed corrects
 *   that at the cost of at most one COUNT per user per day.
 */
// v2: stored as a Number for atomic ADD. The old string `watched-runtime`
// items (no TTL) are never read or written again.
const watchedRuntimeCacheKey = (userId: string) =>
  `profile:${userId}:watched-runtime:v2`;
const watchedCountCacheKey = (userId: string) =>
  `profile:${userId}:watched-count`;

const WATCHED_COUNT_TTL_SECONDS = 24 * 60 * 60;

/**
 * Applies per-user deltas to existing counters, one atomic update per user, in
 * parallel. A missing (or, with `requireUnexpired`, expired) counter is left
 * alone: the API computes it fresh on the next request.
 */
const applyCounterDeltas = async (
  deltas: ReadonlyMap<string, number>,
  cacheKey: (userId: string) => string,
  label: string,
  options: Readonly<{ requireUnexpired?: boolean }> = {},
) => {
  await Promise.all(
    Array.from(deltas)
      .filter(([, delta]) => delta !== 0)
      .map(async ([userId, delta]) => {
        const applied = await addToCounter(cacheKey(userId), delta, options);
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
    applyCounterDeltas(countDeltas, watchedCountCacheKey, 'count', {
      requireUnexpired: true,
    }),
  ]);
};

/**
 * All-time watched episode count. Reads the counter, and falls back to a full
 * COUNT (seeding the counter for a day) when it's missing or expired.
 */
export const getAllTimeWatchedCount = async (userId: string) => {
  const key = watchedCountCacheKey(userId);
  const cached = await getCounter(key);

  if (cached !== undefined && cached >= 0) {
    return cached;
  }

  const count = await getWatchedCount({ userId });
  await setCounter(key, count, { ttl: WATCHED_COUNT_TTL_SECONDS });

  return count;
};

/**
 * All-time watched runtime. Reads the permanent counter, and recomputes it
 * from every watched item when it's missing, negative, or zero while the user
 * has watched episodes.
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

  const items = await getAllWatched({ userId });
  const runtime = items.reduce((sum, item) => sum + (item.runtime || 0), 0);
  await setCounter(key, runtime, { ttl: null });

  return runtime;
};
