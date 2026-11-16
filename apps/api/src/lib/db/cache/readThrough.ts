import {
  getCacheEntries,
  getCacheEntry,
  setCacheItem,
  setCacheItems,
} from '@/lib/db/cache';
import { createLimiter, mapSettled } from '@/utils/limit';
import { logWarn } from '@/utils/logWarn';

/** Seconds a value is stored, or `false` when it must not be stored at all */
type Ttl<T> = number | ((value: T) => number | false);

const secondsFor = <T>(ttl: Ttl<T>, value: T) =>
  typeof ttl === 'function' ? ttl(value) : ttl;

/**
 * Cache-table read-through: returns the cached value, else loads it and stores
 * it for `ttl` seconds (a function of the value, e.g. a shorter TTL for a
 * negative or partial result; `false` when the value must not be stored at
 * all, e.g. nothing could be built). Best-effort: a cache failure is a miss
 * and never fails the request. A cached `null` is a hit.
 *
 * Stale if error: when `load` fails and the table still holds an expired value
 * for the key (DynamoDB deletes expired items up to about 48 h late), that
 * value is returned instead of the error, and not stored again, so the next
 * read tries `load` once more.
 */
export const readThrough = async <T>(
  key: string,
  ttl: Ttl<T>,
  load: () => Promise<T>,
): Promise<T> => {
  let stale: Readonly<{ value: T | null }> | undefined;
  try {
    const entry = await getCacheEntry<T>(key);
    if (entry && !entry.expired) {
      return entry.value as T;
    }
    stale = entry;
  } catch (error) {
    logWarn(`Cache get failed for ${key}`, error);
  }

  let value: T;
  try {
    value = await load();
  } catch (error) {
    if (stale) {
      logWarn(`Serving an expired cache value for ${key}`, error);
      return stale.value as T;
    }
    throw error;
  }

  const seconds = secondsFor(ttl, value);
  if (seconds === false) {
    return value;
  }
  try {
    await setCacheItem(key, value, { ttl: seconds });
  } catch (error) {
    logWarn(`Cache set failed for ${key}`, error);
  }

  return value;
};

type Entry<T> = Readonly<{ expired: boolean; value: T | null }>;

type ManyOptions<K, T> = Readonly<{
  /** The Cache-table key of one item */
  key: (item: K) => string;
  ttl: Ttl<T>;
  load: (item: K) => Promise<T>;
  /** Loads in flight at once */
  concurrency: number;
  /**
   * A load that fails with no expired value to serve: `'reject'` fails the
   * whole read and stores nothing; `'tolerate'` leaves the item out of the
   * answer, unless more than 10% of the loads fail (mapSettled's rule)
   */
  failures: 'reject' | 'tolerate';
}>;

/**
 * `readThrough` for many items at once: one batch read (BatchGetItem, 100
 * keys a call) instead of one read per key, `load` for the misses only, and
 * the loaded values stored in batch writes (one per TTL). Per item it keeps
 * readThrough's rules: a cache failure is a miss, a cached `null` is a hit,
 * `ttl` may decline to store a value, and an expired value still in the table
 * is served (not stored again) when its load fails. The answer is in the
 * order asked; an item asked twice is read and loaded once.
 */
export const readThroughMany = async <K, T>(
  items: ReadonlyArray<K>,
  { concurrency, failures, key, load, ttl }: ManyOptions<K, T>,
): Promise<Map<K, T>> => {
  const byKey = new Map(items.map((item) => [key(item), item] as const));
  if (byKey.size === 0) {
    return new Map();
  }

  const entries = await getCacheEntries<T>([...byKey.keys()]).catch(
    (error: unknown) => {
      logWarn(`Cache get failed for ${byKey.size} keys`, error);
      return new Map<string, Entry<T>>();
    },
  );
  const misses = [...byKey].filter(([cacheKey]) => {
    const entry = entries.get(cacheKey);
    return !entry || entry.expired;
  });

  /** One miss, loaded (to store) or its expired value (served as is) */
  const loadOne = async ([cacheKey, item]: readonly [string, K]) => {
    try {
      return { cacheKey, store: true, value: await load(item) };
    } catch (error) {
      const stale = entries.get(cacheKey);
      if (!stale) {
        throw error;
      }
      logWarn(`Serving an expired cache value for ${cacheKey}`, error);
      return { cacheKey, store: false, value: stale.value as T };
    }
  };
  const limit = createLimiter(concurrency);
  const loaded =
    failures === 'reject'
      ? await Promise.all(misses.map((miss) => limit(() => loadOne(miss))))
      : await mapSettled(misses, loadOne, concurrency);

  const toStore = new Map<number, Array<readonly [string, T]>>();
  for (const { cacheKey, store, value } of loaded) {
    const seconds = store ? secondsFor(ttl, value) : false;
    if (seconds !== false) {
      toStore.set(seconds, [
        ...(toStore.get(seconds) ?? []),
        [cacheKey, value],
      ]);
    }
  }
  await Promise.all(
    [...toStore].map(([seconds, group]) =>
      setCacheItems(group, { ttl: seconds }).catch((error: unknown) =>
        logWarn(`Cache set failed for ${group.length} keys`, error),
      ),
    ),
  );

  const values = new Map<string, T>();
  for (const [cacheKey, entry] of entries) {
    if (!entry.expired) {
      values.set(cacheKey, entry.value as T);
    }
  }
  for (const { cacheKey, value } of loaded) {
    values.set(cacheKey, value);
  }
  const answer = new Map<K, T>();
  for (const [cacheKey, item] of byKey) {
    if (values.has(cacheKey)) {
      answer.set(item, values.get(cacheKey) as T);
    }
  }
  return answer;
};
