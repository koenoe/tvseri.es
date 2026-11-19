import type { TvSeries } from '@tvseri.es/schemas';

import { seasonsWithSpecials } from '@/lib/series/seasons';

import type { SeasonInfo } from './types';

/**
 * The store's season summary from `GET /series/:id` (no episodes), specials
 * (season 0) last.
 */
export function toSeasonInfo(
  series: Pick<TvSeries, 'seasons' | 'specials'>,
): ReadonlyArray<SeasonInfo> {
  return seasonsWithSpecials(series).map((season) => ({
    airedEpisodeCount: season.numberOfAiredEpisodes ?? 0,
    episodeCount: season.numberOfEpisodes ?? season.episodes.length,
    ...(season.firstEpisodeNumber === undefined
      ? {}
      : { firstEpisodeNumber: season.firstEpisodeNumber }),
    seasonNumber: season.seasonNumber,
  }));
}
