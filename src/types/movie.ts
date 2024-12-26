import { type TvSeries } from './tv-series';

export type Movie = Omit<
  TvSeries,
  | 'createdBy'
  | 'firstAirDate'
  | 'lastAirDate'
  | 'lastEpisodeToAir'
  | 'numberOfEpisodes'
  | 'numberOfSeasons'
  | 'originCountry'
  | 'releaseYear'
  | 'seasons'
>;
