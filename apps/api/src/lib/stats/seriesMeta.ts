/**
 * The genres and countries of the series a user watched, for the genre and
 * country stats. Both read the same series, so one lookup serves both.
 *
 * Kept per series (not per user) in the Cache table for a week, so the stats
 * of every user and year share them; only misses go to TMDB.
 */

import { readThroughMany } from '@/lib/db/cache/readThrough';
import { fetchTvSeriesBase } from '@/lib/tmdb';
import { TMDB_CONCURRENCY } from '@/lib/upstream/budget';

import type { StatsSeriesMeta } from './aggregations';

const CACHE_TTL = 7 * 24 * 60 * 60; // 7 days

const cacheKey = (id: number) => `stats-series:v1:${id}`;

/**
 * Resolves each id to its genres and countries, in the same order. Series
 * TMDB doesn't know resolve to `undefined` and are skipped by the
 * aggregations; any other TMDB failure rejects, so a partial result never
 * gets cached.
 */
export const fetchStatsSeriesMeta = async (
  ids: ReadonlyArray<number>,
): Promise<Array<StatsSeriesMeta | undefined>> => {
  const meta = await readThroughMany<number, StatsSeriesMeta | undefined>(ids, {
    concurrency: TMDB_CONCURRENCY,
    failures: 'reject',
    key: cacheKey,
    load: async (id) => {
      const series = await fetchTvSeriesBase(id);
      return (
        series && {
          countries: (series.countries ?? []).map(({ code, name }) => ({
            code,
            name,
          })),
          genres: series.genres.map(({ name }) => ({ name })),
        }
      );
    },
    // A show TMDB doesn't know is asked again next time
    ttl: (value) => (value ? CACHE_TTL : false),
  });
  return ids.map((id) => meta.get(id) ?? undefined);
};
