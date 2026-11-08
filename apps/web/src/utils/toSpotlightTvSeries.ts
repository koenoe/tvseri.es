import type { Genre, TvSeries } from '@tvseri.es/schemas';

/**
 * The fields the home Spotlight (and the page background behind it) reads.
 * Only the first genre's name is shown.
 */
export type SpotlightTvSeries = Readonly<
  Pick<
    TvSeries,
    | 'backdropColor'
    | 'backdropImage'
    | 'id'
    | 'numberOfSeasons'
    | 'releaseYear'
    | 'slug'
    | 'tagline'
    | 'title'
    | 'titleTreatmentImage'
  > & {
    genres: ReadonlyArray<Pick<Genre, 'name'>>;
  }
>;

export const toSpotlightTvSeries = (tvSeries: TvSeries): SpotlightTvSeries => ({
  backdropColor: tvSeries.backdropColor,
  backdropImage: tvSeries.backdropImage,
  genres: tvSeries.genres.slice(0, 1).map(({ name }) => ({ name })),
  id: tvSeries.id,
  numberOfSeasons: tvSeries.numberOfSeasons,
  releaseYear: tvSeries.releaseYear,
  slug: tvSeries.slug,
  tagline: tvSeries.tagline,
  title: tvSeries.title,
  titleTreatmentImage: tvSeries.titleTreatmentImage,
});
