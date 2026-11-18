import type { TvSeries } from './tv-series';

export type Movie = Omit<
  TvSeries,
  | 'createdBy'
  | 'firstAirDate'
  | 'hasAired'
  | 'lastAirDate'
  | 'lastEpisodeToAir'
  | 'network'
  | 'numberOfAiredEpisodes'
  | 'numberOfEpisodes'
  | 'numberOfSeasons'
  | 'originCountry'
  | 'releaseYear'
  | 'seasons'
  | 'status'
  | 'type'
> & {
  /** YYYY-MM-DD, when TMDB knows it (Known for: "Film · 2015") */
  releaseDate?: string;
};
