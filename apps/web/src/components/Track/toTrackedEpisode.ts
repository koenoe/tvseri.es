import type { Episode, WatchedItem } from '@tvseri.es/schemas';

import type { TrackedEpisode, WatchedAtChoice } from './types';

type WatchProviderFields = Pick<
  WatchedItem,
  'watchProviderLogoImage' | 'watchProviderLogoPath' | 'watchProviderName'
>;

/**
 * `airDate` is a date-only value stored as UTC midnight. Convert it to local
 * noon on that calendar day so the stored instant shows the release date in
 * every time zone (UTC midnight renders as the previous day west of UTC).
 */
function airDateToWatchedAt(airDate: string) {
  const date = new Date(airDate);

  if (Number.isNaN(date.getTime())) {
    return Date.now();
  }

  return new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    12,
  ).getTime();
}

export default function toTrackedEpisode(
  episode: Episode,
  watchedAt: WatchedAtChoice,
  watchProvider?: WatchProviderFields,
): TrackedEpisode {
  return {
    episodeAirDate: episode.airDate,
    episodeNumber: episode.episodeNumber,
    episodeStillPath: episode.stillPath,
    episodeTitle: episode.title,
    runtime: episode.runtime,
    seasonNumber: episode.seasonNumber,
    watchedAt:
      watchedAt === 'release-date'
        ? airDateToWatchedAt(episode.airDate)
        : watchedAt,
    ...watchProvider,
  };
}
