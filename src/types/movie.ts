import { type TvSeries } from './tv-series';

export type Movie = Omit<
  TvSeries,
  | 'createdBy'
  | 'firstAirDate'
  | 'lastAirDate'
  | 'lastEpisodeToAir'
  | 'numberOfAiredEpisodes'
  | 'numberOfEpisodes'
  | 'numberOfSeasons'
  | 'originCountry'
  | 'releaseYear'
  | 'seasons'
  | 'status'
>;
