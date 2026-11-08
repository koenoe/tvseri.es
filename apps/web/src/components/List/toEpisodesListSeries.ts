import type { Season, TvSeries } from '@tvseri.es/schemas';

/** The season fields the episodes list and its season select read. */
type EpisodesListSeason = Readonly<
  Pick<Season, 'airDate' | 'id' | 'seasonNumber' | 'title'>
>;

export type EpisodesListSeries = Readonly<
  Pick<TvSeries, 'id'> & {
    seasons: ReadonlyArray<EpisodesListSeason>;
  }
>;

/**
 * Trims a series to what `EpisodesList` reads, so the RSC payload doesn't
 * carry the full series (episodes are fetched on the client per season).
 */
export const toEpisodesListSeries = ({
  id,
  seasons = [],
}: Pick<TvSeries, 'id' | 'seasons'>): EpisodesListSeries => ({
  id,
  seasons: seasons.map((season) => ({
    airDate: season.airDate,
    id: season.id,
    seasonNumber: season.seasonNumber,
    title: season.title,
  })),
});
