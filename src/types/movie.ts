import { type TvSeries } from './tv-series';

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
>;
