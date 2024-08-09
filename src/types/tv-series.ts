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
  stillImage: string;
}>;

export type Season = Readonly<{
  description: string;
  id: number;
  airDate: string;
  seasonNumber: number;
  title: string;
  episodes: Episode[];
  episodeCount?: number;
}>;

export type TvSeries = Omit<Movie, 'runtime' | 'releaseDate' | 'imdbId'> &
  Readonly<{
    createdBy: Person[];
    firstAirDate: string;
    firstEpisodeToAir: Episode;
    lastAirDate: string;
    lastEpisodeToAir: Episode;
    numberOfEpisodes: number;
    numberOfSeasons: number;
    releaseYear: string;
    seasons?: Season[];
  }>;
