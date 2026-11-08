/**
 * The genres and countries of the series a user watched, for the genre and
 * country stats. Both read the same series, so one lookup serves both.
 *
 * Kept per series (not per user) in the Cache table for a week, so the stats
 * of every user and year share them; only misses go to TMDB.
 */

import { getCacheItems, setCacheItems } from '@/lib/db/cache';
import { fetchTvSeriesBase, TMDB_CONCURRENCY } from '@/lib/tmdb';
import { createLimiter } from '@/utils/limit';
import { logWarn } from '@/utils/logWarn';

import type { StatsSeriesMeta } from './aggregations';

const CACHE_TTL = 7 * 24 * 60 * 60; // 7 days

const cacheKey = (id: number) => `stats-series:v1:${id}`;

/**
 * Resolves each id to its genres and countries, in the same order. Series
 * that don't exist (anymore) resolve to `undefined` and are skipped by the
 * aggregations; any other TMDB failure rejects, so a partial result never
 * gets cached.
 */
export const fetchStatsSeriesMeta = async (
  ids: ReadonlyArray<number>,
): Promise<Array<StatsSeriesMeta | undefined>> => {
  if (ids.length === 0) {
    return [];
  }

  const cached = await getCacheItems<StatsSeriesMeta>(ids.map(cacheKey)).catch(
    (error: unknown) => {
      logWarn('Stats series cache get failed, continuing without cache', error);
      return new Map<string, StatsSeriesMeta>();
    },
  );
  const missingIds = ids.filter((id) => !cached.has(cacheKey(id)));

  const limit = createLimiter(TMDB_CONCURRENCY);
  const fetched = await Promise.all(
    missingIds.map((id) =>
      limit(async () => {
        const series = await fetchTvSeriesBase(id);
        return series
          ? ([
              id,
              {
                countries: (series.countries ?? []).map(({ code, name }) => ({
                  code,
                  name,
                })),
                genres: series.genres.map(({ name }) => ({ name })),
              },
            ] as const)
          : undefined;
      }),
    ),
  );

  const found = fetched.filter((entry) => entry !== undefined);
  const fetchedById = new Map<number, StatsSeriesMeta>(found);

  if (found.length > 0) {
    await setCacheItems(
      found.map(([id, meta]) => [cacheKey(id), meta] as const),
      { ttl: CACHE_TTL },
    ).catch((error: unknown) =>
      logWarn('Stats series cache set failed, continuing without cache', error),
    );
  }

  return ids.map((id) => cached.get(cacheKey(id)) ?? fetchedById.get(id));
};
