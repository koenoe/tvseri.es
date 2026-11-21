import type { Season } from '@tvseri.es/schemas';
import { MARK_COPY, readShow } from '@/lib/catalogue';
import { readThroughStale } from '@/lib/db/cache/readThroughStale';
import { pathId } from '@/lib/tmdb/client';
import { fetchTvSeriesSeason, fetchTvSeriesSeasons } from '@/lib/tmdb/seasons';

/**
 * `readShow(id, 'mark')` for routes/user/index.ts, which still passes the
 * route's id text while it is reworked. Remove with that use.
 */
export const seriesForMark = (id: number | string) =>
  readShow(pathId(id), 'mark');

/** Each season a mark reads, stored as the show is (`MARK_COPY`) */
const { freshSeconds: FRESH_SECONDS, keepSeconds: KEEP_SECONDS } = MARK_COPY;
const WAIT_MS = MARK_COPY.waitMs;

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
    async () => (await fetchTvSeriesSeason(pathId(id), seasonNumber)) ?? null,
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
          batch ??= fetchTvSeriesSeasons(pathId(id), numbers);
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
