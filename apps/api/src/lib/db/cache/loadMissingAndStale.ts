import { refreshWaitMs } from '@/lib/deadline';
import { atLowPriority, TMDB_CONCURRENCY } from '@/lib/upstream/budget';
import { createLimiter } from '@/utils/limit';
import { within } from '@/utils/within';

type Options<K, V> = Readonly<{
  /** Not stored (or past its last use): the answer waits for these */
  missing: ReadonlyArray<K>;
  /** Stored but old: served already, refreshed behind them */
  stale: ReadonlyArray<K>;
  /** One item from TMDB; undefined leaves it out (the caller logs a failure) */
  load: (key: K) => Promise<V | undefined>;
  /** Stores what a batch loaded; best-effort, its own failures handled */
  store: (loaded: ReadonlyArray<V>) => Promise<unknown>;
}>;

/**
 * The many-key half of stale-while-revalidate, once a caller has read its
 * stored entries and sorted the keys into missing and stale: both loaded at
 * TMDB's concurrency and stored per batch. Only the missing hold the answer.
 * The stale refresh goes behind every other call of the instance
 * (`atLowPriority`) and is waited for only what is left of the request's
 * refresh wait (`refreshWaitMs`): what ends by then is returned, the rest
 * stores when it ends. On Lambda that may be a later invocation (the
 * environment freezes once the handler returns; Hono on Lambda has no
 * waitUntil); a refresh that never ends is lost and a later read retries.
 */
export const loadMissingAndStale = async <K, V>({
  load,
  missing,
  stale,
  store,
}: Options<K, V>): Promise<ReadonlyArray<V>> => {
  const loadMany = (keys: ReadonlyArray<K>) => {
    const limit = createLimiter(TMDB_CONCURRENCY);
    return Promise.all(keys.map((key) => limit(() => load(key)))).then(
      async (loaded) => {
        const found = loaded.filter((value) => value !== undefined);
        await store(found);
        return found;
      },
    );
  };

  const refreshing = atLowPriority(() => loadMany(stale));
  refreshing.catch(() => undefined);
  const [found, refreshed] = await Promise.all([
    loadMany(missing),
    within(refreshing, refreshWaitMs()).catch(() => undefined),
  ]);
  return [
    ...found,
    ...(refreshed && !refreshed.timedOut ? refreshed.value : []),
  ];
};
