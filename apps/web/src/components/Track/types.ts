import type { Episode, Season, WatchedItem } from '@tvseri.es/schemas';

/** The episode fields the track cards read (sent from the server) */
export type TrackEpisode = Readonly<
  Pick<
    Episode,
    | 'airDate'
    | 'episodeNumber'
    | 'hasAired'
    | 'id'
    | 'runtime'
    | 'seasonNumber'
    | 'stillImage'
    | 'stillPath'
    | 'title'
  >
>;

/** The season fields the track cards read (sent from the server) */
export type TrackSeason = Readonly<
  Pick<Season, 'id' | 'numberOfAiredEpisodes' | 'seasonNumber' | 'title'> & {
    episodes: ReadonlyArray<TrackEpisode>;
  }
>;

/** A (possibly optimistic) watched episode as tracked on the /track page. */
export type TrackedEpisode = Partial<WatchedItem> &
  Pick<WatchedItem, 'episodeNumber' | 'runtime' | 'seasonNumber' | 'watchedAt'>;

export type WatchedAction = Readonly<{
  type: 'delete' | 'update';
  items: TrackedEpisode[];
}>;

/** A picked watch date (epoch ms), or each episode's own release date. */
export type WatchedAtChoice = number | 'release-date';
