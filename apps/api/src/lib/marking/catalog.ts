import type { Season, TvSeries } from '@tvseri.es/schemas';

import { readStored, readThroughStale } from '@/lib/db/cache/readThroughStale';
import {
  fetchTvSeriesBase,
  fetchTvSeriesSeason,
  fetchTvSeriesSeasons,
} from '@/lib/tmdb';

/**
 * What season and show marks and unmarks read from TMDB (the show, and each
 * season's episodes), stored per show and season. Fresh for an hour, so
 * a new episode is markable within the hour, and then kept a month: when TMDB
 * can't be asked, a mark or unmark of a show someone marked in the last month
 * works from the stored copy. When the copy is older than an hour, TMDB gets
 * at most WAIT_MS to refresh it before the copy is used. Episode marks never
 * read TMDB (the web sends the episodes).
 */
const FRESH_SECONDS = 60 * 60;
const KEEP_SECONDS = 30 * 24 * 60 * 60;
/**
 * With a stored copy, a mark waits at most this long for TMDB to refresh it,
 * then uses the copy (the refresh still stores when it ends)
 */
const WAIT_MS = 1000;

const seriesKey = (id: number | string) => `mark-series:v1:${id}`;

/** The stored show, however old, without asking TMDB (placing a show) */
export const storedSeriesForMark = async (
  id: number | string,
): Promise<TvSeries | undefined> =>
  (await readStored<TvSeries | null>(seriesKey(id))) ?? undefined;

export const seriesForMark = async (
  id: number | string,
): Promise<TvSeries | undefined> =>
  (await readThroughStale(
    seriesKey(id),
    FRESH_SECONDS,
    KEEP_SECONDS,
    async () => (await fetchTvSeriesBase(id)) ?? null,
    { waitMs: WAIT_MS },
  )) ?? undefined;

const seasonKey = (id: number | string, seasonNumber: number) =>
  `mark-season:v1:${id}:${seasonNumber}`;

export const seasonForMark = async (
  id: number | string,
  seasonNumber: number,
): Promise<Season | undefined> =>
  (await readThroughStale(
    seasonKey(id, seasonNumber),
    FRESH_SECONDS,
    KEEP_SECONDS,
    async () => (await fetchTvSeriesSeason(id, seasonNumber)) ?? null,
    { waitMs: WAIT_MS },
  )) ?? undefined;

/**
 * Several seasons at once, each stored as `seasonForMark` stores it: those
 * not stored fresh come from one batched TMDB call
 * (`fetchTvSeriesSeasons`). A season TMDB doesn't list is absent.
 */
export const seasonsForMark = async (
  id: number | string,
  seasonNumbers: ReadonlyArray<number>,
): Promise<ReadonlyMap<number, Season>> => {
  const numbers = [...new Set(seasonNumbers)];
  // Started by the first season that needs TMDB, shared by the rest
  let batch: ReturnType<typeof fetchTvSeriesSeasons> | undefined;
  const loaded = await Promise.all(
    numbers.map((number) =>
      readThroughStale(
        seasonKey(id, number),
        FRESH_SECONDS,
        KEEP_SECONDS,
        async () => {
          batch ??= fetchTvSeriesSeasons(id, numbers);
          return (await batch)?.get(number) ?? null;
        },
        { waitMs: WAIT_MS },
      ),
    ),
  );
  return new Map(
    loaded.flatMap((season, index) =>
      season ? [[numbers[index] as number, season] as const] : [],
    ),
  );
};
