import type { Season, WatchedItem } from '@tvseri.es/schemas';

import formatSeasonAndEpisode from './formatSeasonAndEpisode';

type CurrentSeason = Readonly<{
  currentSeason: Season | undefined;
  watchCount: number;
}>;

const NO_CURRENT_SEASON: CurrentSeason = {
  currentSeason: undefined,
  watchCount: 0,
};

const getEpisodeTotal = (season: Season) =>
  season.numberOfAiredEpisodes || season.numberOfEpisodes || 0;

/**
 * The season a user is "in": the season of their last watched episode, the
 * next season once that one is finished, or else the first unfinished season.
 * Undefined when nothing is watched yet or everything aired is watched.
 */
export default function getCurrentSeason(
  watchedItems: ReadonlyArray<WatchedItem>,
  seasons: ReadonlyArray<Season>,
): CurrentSeason {
  if (watchedItems.length === 0 || seasons.length === 0) {
    return NO_CURRENT_SEASON;
  }

  const watchCounts = watchedItems.reduce<Record<number, number>>(
    (acc, item) => {
      acc[item.seasonNumber] = (acc[item.seasonNumber] || 0) + 1;
      return acc;
    },
    {},
  );

  const sortedSeasons = [...seasons].sort(
    (a, b) => a.seasonNumber - b.seasonNumber,
  );

  const lastWatched = [...watchedItems].sort((a, b) =>
    formatSeasonAndEpisode({
      episodeNumber: b.episodeNumber ?? 0,
      seasonNumber: b.seasonNumber ?? 0,
    }).localeCompare(
      formatSeasonAndEpisode({
        episodeNumber: a.episodeNumber ?? 0,
        seasonNumber: a.seasonNumber ?? 0,
      }),
    ),
  )[0];

  const lastWatchedSeason = sortedSeasons.find(
    (season) => season.seasonNumber === lastWatched?.seasonNumber,
  );

  if (lastWatchedSeason) {
    const watchCount = watchCounts[lastWatchedSeason.seasonNumber] || 0;

    if (watchCount < getEpisodeTotal(lastWatchedSeason)) {
      return { currentSeason: lastWatchedSeason, watchCount };
    }

    const nextSeason =
      sortedSeasons[sortedSeasons.indexOf(lastWatchedSeason) + 1];

    if (nextSeason?.numberOfAiredEpisodes) {
      return {
        currentSeason: nextSeason,
        watchCount: watchCounts[nextSeason.seasonNumber] || 0,
      };
    }
  }

  const firstUnfinishedSeason = sortedSeasons.find(
    (season) =>
      season.numberOfAiredEpisodes !== 0 &&
      (watchCounts[season.seasonNumber] || 0) < getEpisodeTotal(season),
  );

  return firstUnfinishedSeason
    ? {
        currentSeason: firstUnfinishedSeason,
        watchCount: watchCounts[firstUnfinishedSeason.seasonNumber] || 0,
      }
    : NO_CURRENT_SEASON;
}
