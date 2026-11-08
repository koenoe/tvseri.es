import type { Season, WatchedItem } from '@tvseri.es/schemas';

import getCurrentSeason from './getCurrentSeason';

export type EpisodeRef = Readonly<
  Pick<WatchedItem, 'episodeNumber' | 'seasonNumber'>
>;

const byNumber = (a: Season, b: Season) => a.seasonNumber - b.seasonNumber;

/**
 * The episode "Watched next episode" marks: the first unwatched aired episode
 * of the current season (see getCurrentSeason), or the first aired episode
 * when nothing is watched yet. Undefined when everything aired is watched.
 * Aired episodes are numbered 1..numberOfAiredEpisodes within a season.
 */
export default function getNextEpisode(
  watchedItems: ReadonlyArray<EpisodeRef>,
  seasons: ReadonlyArray<Season>,
): EpisodeRef | undefined {
  const { currentSeason } = getCurrentSeason(watchedItems, seasons);
  const season =
    currentSeason ??
    (watchedItems.length === 0
      ? [...seasons]
          .sort(byNumber)
          .find((item) => (item.numberOfAiredEpisodes ?? 0) > 0)
      : undefined);

  if (!season) {
    return undefined;
  }

  const watchedInSeason = new Set(
    watchedItems
      .filter((item) => item.seasonNumber === season.seasonNumber)
      .map((item) => item.episodeNumber),
  );

  for (
    let episodeNumber = 1;
    episodeNumber <= (season.numberOfAiredEpisodes ?? 0);
    episodeNumber++
  ) {
    if (!watchedInSeason.has(episodeNumber)) {
      return { episodeNumber, seasonNumber: season.seasonNumber };
    }
  }

  return undefined;
}
