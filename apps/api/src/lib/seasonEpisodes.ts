import type { Episode, Season } from '@tvseri.es/schemas';

import { readThroughStale } from '@/lib/db/cache/readThroughStale';
import { refreshWaitMs } from '@/lib/deadline';
import { fetchTvSeriesSeason, fetchTvSeriesSeasons } from '@/lib/tmdb';

/**
 * A season's episode titles and air dates change rarely: kept 6 hours in the
 * Cache table and shared by every user and page (the overview's tiles and
 * tickets, the calendar), so a warm profile makes no TMDB call for them
 */
const SEASON_TTL = 6 * 60 * 60;
const UNKNOWN_SEASON_TTL = 60 * 60;
/** How long a stored season stands in when TMDB can't refresh it */
const SEASON_KEEP = 7 * 24 * 60 * 60;

export type SeasonEpisode = Readonly<{
  /** YYYY-MM-DD, '' when TMDB has none */
  airDate: string;
  episodeNumber: number;
  episodeType?: Episode['episodeType'];
  title: string;
}>;

const slim = (season: Season | undefined) =>
  season
    ? season.episodes.map(
        (episode): SeasonEpisode => ({
          airDate: episode.airDate.slice(0, 10),
          episodeNumber: episode.episodeNumber,
          ...(episode.episodeType && { episodeType: episode.episodeType }),
          title: episode.title,
        }),
      )
    : null;

/**
 * Seasons' episodes by season number (a season TMDB doesn't list is absent):
 * fresh for SEASON_TTL, then served while a refresh gets what is left of the
 * request's refresh wait, at low priority (kept a week). The seasons not
 * stored come from one TMDB call: the season's own for one, a batched
 * `/tv/:id` for several.
 */
export const seasonEpisodes = async (
  seriesId: number,
  seasonNumbers: ReadonlyArray<number>,
): Promise<ReadonlyMap<number, ReadonlyArray<SeasonEpisode>>> => {
  const numbers = [...new Set(seasonNumbers)];
  // Started by the first season that needs TMDB, shared by the rest
  let batch: Promise<ReadonlyMap<number, Season> | undefined> | undefined;
  const loaded = await Promise.all(
    numbers.map((number) =>
      readThroughStale<ReadonlyArray<SeasonEpisode> | null>(
        `season-episodes:v1:${seriesId}:${number}`,
        (value) => (value ? SEASON_TTL : UNKNOWN_SEASON_TTL),
        SEASON_KEEP,
        async () => {
          if (numbers.length === 1) {
            return slim(await fetchTvSeriesSeason(seriesId, number));
          }
          batch ??= fetchTvSeriesSeasons(seriesId, numbers);
          return slim((await batch)?.get(number));
        },
        { lowPriority: true, waitMs: refreshWaitMs },
      ),
    ),
  );
  return new Map(
    loaded.flatMap((episodes, index) =>
      episodes ? [[numbers[index] as number, episodes] as const] : [],
    ),
  );
};

/**
 * How a season comes out, from its episodes' dates: `full-season` when all
 * of them land on one day, `weekly` when they don't (an undated episode
 * counts as another day), null for a single episode
 */
export const releaseOf = (
  episodes: ReadonlyArray<SeasonEpisode>,
): 'full-season' | 'weekly' | null => {
  if (episodes.length < 2) return null;
  return new Set(episodes.map((episode) => episode.airDate)).size === 1
    ? 'full-season'
    : 'weekly';
};
