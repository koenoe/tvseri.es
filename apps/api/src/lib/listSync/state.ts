import { type ListState, listStateOf, showProgress } from '@tvseri.es/utils';

import type { PlacementSeries } from './writes';

export type { ListState };

/**
 * Which list a show belongs in for a user, by the shared progress rule
 * (`showProgress`): Finished once at least one regular episode is watched
 * and no aired regular episode is open (neither watched nor skipped);
 * specials never count, and neither does a watched row or a skip outside
 * the aired episodes.
 */
export const decideListState = ({
  seasons,
  skipped,
  watched,
}: Readonly<{
  /** Aired regular episodes per season, from its first episode number */
  seasons: NonNullable<PlacementSeries['seasons']>;
  /** The show's watched episode codes (`S01E02`) */
  watched: ReadonlyArray<string>;
  skipped: ReadonlyArray<string>;
}>): ListState =>
  listStateOf(
    showProgress({
      seasons: seasons.map((season) => ({
        airedCount: season.numberOfAiredEpisodes ?? 0,
        firstEpisodeNumber: season.firstEpisodeNumber,
        seasonNumber: season.seasonNumber,
      })),
      skipped,
      watched,
    }),
  );
