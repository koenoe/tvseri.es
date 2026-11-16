import { atLowPriority } from '@/lib/upstream/budget';
import { logWarn } from '@/utils/logWarn';
import { within } from '@/utils/within';

import { getCacheEntry, setCacheItem } from './index';
import { claim } from './singleFlight';

/**
 * Read-through with a long stale ceiling: the stored value is used while
 * fresh (`freshSeconds`); past that it is fetched again, and when that fails
 * (TMDB down, a breaker open) the stored copy is served, however old, for as
 * long as it is kept (`keepSeconds`, the DynamoDB TTL). Unlike readThrough,
 * whose stale-if-error only finds what the TTL sweep hasn't deleted yet, a
 * copy here outlives its freshness by design.
 *
 * Stored as `{ freshUntil, value }`. A `null` load (unknown id) is stored
 * too, so an unknown id isn't asked again while fresh. `freshSeconds` may be a
 * function of the value: `false` returns it without storing it (an answer
 * that is not a fact, like a hit quota).
 */

/** A stored copy and when it stops being fresh (also readThroughDay's) */
export type Stored<T> = Readonly<{ freshUntil: number; value: T }>;

/**
 * The stored copy with its freshness, however old: undefined when none or
 * when the read fails (the cache is best effort)
 */
export const readStoredEntry = async <T>(key: string) => {
  try {
    return (await getCacheEntry<Stored<T>>(key))?.value ?? undefined;
  } catch (error) {
    logWarn(`Cache get failed for ${key}`, error);
    return undefined;
  }
};

/** The stored value, however old, without loading: undefined when none */
export const readStored = async <T>(key: string): Promise<T | undefined> =>
  (await readStoredEntry<T>(key))?.value;

type Options = Readonly<{
  /**
   * With a stored copy, wait at most this long for a fresh value, then
   * serve the copy (the load still stores its value when it ends). For a
   * write that must not wait on an upstream (the mark routes).
   */
  waitMs?: number | (() => number);
  /**
   * With a stored copy, the refresh's upstream calls go behind every other
   * call of the instance (`atLowPriority`): a read never queues the data it
   * lacks behind refreshes of data it has.
   */
  lowPriority?: boolean;
  /**
   * With a stored copy, only one Lambda refreshes it at a time: a claim on
   * the key (singleFlight.ts) lasting this many seconds; the others serve
   * the copy at once.
   */
  singleFlightSeconds?: number;
}>;

export const readThroughStale = async <T>(
  key: string,
  freshSeconds: number | ((value: T) => number | false),
  keepSeconds: number,
  load: () => Promise<T>,
  { lowPriority = false, singleFlightSeconds, waitMs }: Options = {},
): Promise<T> => {
  const stored = await readStoredEntry<T>(key);
  if (stored && stored.freshUntil > Date.now()) {
    return stored.value;
  }
  if (stored && singleFlightSeconds !== undefined) {
    const mine = await claim(`refresh:${key}`, singleFlightSeconds).catch(
      () => true,
    );
    if (!mine) {
      return stored.value;
    }
  }

  const run = () => loadAndStore(key, freshSeconds, keepSeconds, load);
  const loading = stored && lowPriority ? atLowPriority(run) : run();
  if (stored && waitMs !== undefined) {
    // A late load still stores its value; its failure is only logged
    loading.catch((error: unknown) =>
      logWarn(`Serving a stored value for ${key}`, error),
    );
    const ms = typeof waitMs === 'function' ? waitMs() : waitMs;
    const outcome = await within(loading, ms).catch(() => undefined);
    return outcome && !outcome.timedOut ? outcome.value : stored.value;
  }
  try {
    return await loading;
  } catch (error) {
    if (stored) {
      logWarn(`Serving a stored value for ${key}`, error);
      return stored.value;
    }
    throw error;
  }
};

const loadAndStore = async <T>(
  key: string,
  freshSeconds: number | ((value: T) => number | false),
  keepSeconds: number,
  load: () => Promise<T>,
): Promise<T> => {
  const value = await load();

  const seconds =
    typeof freshSeconds === 'function' ? freshSeconds(value) : freshSeconds;
  if (seconds === false) {
    return value;
  }
  try {
    await setCacheItem(
      key,
      {
        freshUntil: Date.now() + seconds * 1000,
        value,
      } satisfies Stored<T>,
      { ttl: keepSeconds },
    );
  } catch (error) {
    logWarn(`Cache set failed for ${key}`, error);
  }
  return value;
};
