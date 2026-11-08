import type { Season, TvSeries } from '@tvseri.es/schemas';

/**
 * What the watched store reads from a season: episode totals for progress and
 * "watched next episode", and the title for the in-progress tile.
 */
export type WatchedStoreSeason = Readonly<
  Pick<
    Season,
    'numberOfAiredEpisodes' | 'numberOfEpisodes' | 'seasonNumber' | 'title'
  >
>;

export type WatchedStoreTvSeries = Readonly<
  Pick<TvSeries, 'id' | 'numberOfAiredEpisodes' | 'numberOfEpisodes'> & {
    seasons?: ReadonlyArray<WatchedStoreSeason>;
  }
>;

/**
 * Trims a series to what the watched store reads, so seeding the store
 * doesn't serialise the full series (and every episode) to the client.
 */
export const toWatchedStoreTvSeries = (
  tvSeries: TvSeries,
): WatchedStoreTvSeries => ({
  id: tvSeries.id,
  numberOfAiredEpisodes: tvSeries.numberOfAiredEpisodes,
  numberOfEpisodes: tvSeries.numberOfEpisodes,
  seasons: tvSeries.seasons?.map(
    ({ numberOfAiredEpisodes, numberOfEpisodes, seasonNumber, title }) => ({
      numberOfAiredEpisodes,
      numberOfEpisodes,
      seasonNumber,
      title,
    }),
  ),
});
