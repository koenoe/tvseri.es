import type { WatchedItem } from '@tvseri.es/schemas';

/** A (possibly optimistic) watched episode as tracked on the /track page. */
export type TrackedEpisode = Partial<WatchedItem> &
  Pick<WatchedItem, 'episodeNumber' | 'runtime' | 'seasonNumber' | 'watchedAt'>;

export type WatchedAction = Readonly<{
  type: 'delete' | 'update';
  items: TrackedEpisode[];
}>;

/** A picked watch date (epoch ms), or each episode's own release date. */
export type WatchedAtChoice = number | 'release-date';
