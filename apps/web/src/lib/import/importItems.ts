import type {
  Episode,
  ImportBatch,
  TvSeries,
  WatchProvider,
} from '@tvseri.es/schemas';

/** A row matched to an episode, ready to be written. */
export type ImportItemRow = Readonly<{
  watchedAt: number | null;
  watchProvider: WatchProvider | null;
  tvSeries: Pick<
    TvSeries,
    'id' | 'posterImage' | 'posterPath' | 'slug' | 'title'
  >;
  episode: Episode;
  seasonNumber: number;
}>;

/**
 * The API's batch item for a matched row. "I don't remember" (`watchedAt`
 * null) is `dateUnknown` with `now` as the time it was marked, as the mark
 * routes do.
 */
export const toImportItem = (
  matched: ImportItemRow,
  now: number,
): ImportBatch[number] => ({
  ...(matched.watchedAt === null ? { dateUnknown: true as const } : {}),
  episode: {
    airDate: matched.episode.airDate ?? '',
    episodeNumber: matched.episode.episodeNumber,
    runtime: Math.min(Math.max(matched.episode.runtime ?? 0, 0), 1440),
    seasonNumber: matched.seasonNumber,
    stillPath: matched.episode.stillPath || null,
    title: matched.episode.title ?? '',
  },
  tvSeries: {
    id: matched.tvSeries.id,
    posterPath: matched.tvSeries.posterPath ?? '',
    slug: matched.tvSeries.slug,
    title: matched.tvSeries.title,
  },
  watchedAt: matched.watchedAt ?? now,
  watchProvider: matched.watchProvider,
});
