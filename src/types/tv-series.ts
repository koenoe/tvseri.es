import { type Movie } from './movie';
import { type Person } from './person';

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

export type TvSeries = Omit<Movie, 'runtime' | 'releaseDate' | 'imdbId'> &
  Readonly<{
    createdBy: Person[];
    firstAirDate: string;
    firstEpisodeToAir: Episode;
    lastAirDate: string;
    lastEpisodeToAir: Episode;
    numberOfSeasons: number;
    releaseYear: string;
  }>;
