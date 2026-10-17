import type { TvSeries } from '@tvseri.es/schemas';

import { fetchTvSeriesBase } from '@/lib/tmdb';

const TTL_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ENTRIES = 500;

type Entry = Readonly<{
  expiresAt: number;
  tvSeries: TvSeries | null;
}>;

/**
 * Module-level cache that persists between warm Lambda invocations.
 * TV series data is the same for all users, so it's safe to share. Entries
 * expire so aired-episode counts and next-episode dates don't go stale on
 * long-lived containers, and the size is bounded.
 */
const cache = new Map<number, Entry>();

/**
 * Background Lambdas only need list fields and episode counts, so this uses
 * the slim fetch (no preferred images / dominant colour lookups).
 */
export const cachedTvSeries = async (id: number): Promise<TvSeries | null> => {
  const now = Date.now();
  const entry = cache.get(id);

  if (entry && entry.expiresAt > now) {
    return entry.tvSeries;
  }

  const tvSeries = (await fetchTvSeriesBase(id)) ?? null;

  // Re-insert so Map order stays oldest-first, then evict the oldest if full.
  cache.delete(id);
  if (cache.size >= MAX_ENTRIES) {
    const oldestId = cache.keys().next().value;
    if (oldestId !== undefined) {
      cache.delete(oldestId);
    }
  }
  cache.set(id, { expiresAt: now + TTL_MS, tvSeries });

  return tvSeries;
};
