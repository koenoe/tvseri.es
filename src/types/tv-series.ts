import type { Movie } from './movie';

export type Episode = Readonly<{
  description: string;
  episodeNumber: number;
  id: number;
  airDate: string;
  seasonNumber: number;
  title: string;
  runtime: number;
}>;

export type Season = Readonly<{
  description: string;
  id: number;
  numberOfEpisodes: number;
  airDate: string;
  seasonNumber: number;
  title: string;
}>;

export type TvSeries = Omit<
  Movie,
  'runtime' | 'releaseDate' | 'releaseYear' | 'imdbId'
> &
  Readonly<{
    numberOfSeasons: number;
    firstAirDate: string;
    firstEpisodeToAir: Episode;
    lastAirDate: string;
    lastEpisodeToAir: Episode;
  }>;
