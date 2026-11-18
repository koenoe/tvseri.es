import { seasonCode, type TvSeries } from '@tvseri.es/schemas';
import {
  isRunning,
  type SeasonsOutlook,
  seasonsOutlook,
} from '@tvseri.es/utils';

/** A show's status as a fact beside its title: the glyph kind and the words */
export type StatusFact = Readonly<{
  kind: 'ended' | 'ongoing';
  text: string;
}>;

/**
 * TMDB's status and the season it lists as coming (`seasonsOutlook`, or the
 * API's facts). An object, so a season count can't be passed for the season.
 */
type StatusInput = Readonly<{
  status: string;
  renewedSeason?: number | null;
}>;

/**
 * TMDB's status as every page says it. A returning show is "S02 renewed"
 * only when TMDB lists that season; else just "Returning". A status it has
 * no words for is shown as TMDB has it.
 */
export function statusLabel({ renewedSeason, status }: StatusInput): string {
  switch (status) {
    case 'Returning Series':
      return renewedSeason
        ? `${seasonCode(renewedSeason)} renewed`
        : 'Returning';
    case 'Ended':
      return 'Ended';
    case 'Canceled':
      return 'Cancelled';
    case 'Planned':
    case 'In Production':
    case 'Pilot':
      return 'In production';
    default:
      return status;
  }
}

/**
 * The status with its glyph kind (Library tiles, Favourites slices); none is
 * null. A status TMDB doesn't list as running reads as ended, as the series'
 * years do (`formatSeriesYears`).
 */
export function statusFact(input: StatusInput): StatusFact | null {
  if (!input.status) {
    return null;
  }
  return {
    kind: isRunning(input.status) ? 'ongoing' : 'ended',
    text: statusLabel(input),
  };
}

/**
 * A show's aired seasons and listed renewal from its details. Without the
 * seasons (a list-shaped read) TMDB's count stands and no renewal is claimed.
 */
export function seriesSeasons(
  series: Pick<TvSeries, 'numberOfSeasons' | 'seasons' | 'status'>,
): SeasonsOutlook {
  if (!series.seasons?.length) {
    return { airedSeasons: series.numberOfSeasons, renewedSeason: null };
  }
  return seasonsOutlook(
    series.status,
    series.seasons.map((season) => ({
      seasonNumber: season.seasonNumber,
      started: (season.numberOfAiredEpisodes ?? 0) > 0 || season.hasAired,
    })),
  );
}
