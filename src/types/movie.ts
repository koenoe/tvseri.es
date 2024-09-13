import { type TvSeries } from './tv-series';

export type Movie = Omit<
  TvSeries,
  | 'createdBy'
  | 'firstAirDate'
  | 'firstEpisodeToAir'
  | 'lastAirDate'
  | 'lastEpisodeToAir'
  | 'numberOfEpisodes'
  | 'numberOfSeasons'
  | 'releaseYear'
  | 'seasons'
>;
