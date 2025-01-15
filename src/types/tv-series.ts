import { type Genre } from './genre';
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
  numberOfEpisodes?: number;
  numberOfAiredEpisodes?: number;
}>;

type Status =
  | 'returning series'
  | 'planned'
  | 'in production'
  | 'ended'
  | 'canceled'
  | 'pilot';

type Language = Readonly<{
  englishName: string;
  name: string;
  code: string;
}>;

type Country = Readonly<{
  name: string;
  code: string;
}>;

export type TvSeries = Readonly<{
  backdropColor: string;
  backdropImage?: string;
  backdropPath?: string; // Note: handy for cache keys
  countries: Country[];
  createdBy: Person[];
  description: string;
  firstAirDate: string;
  genres: Genre[];
  id: number;
  isAdult: boolean;
  languages: Language[];
  lastAirDate: string;
  lastEpisodeToAir: Episode;
  numberOfEpisodes: number;
  numberOfAiredEpisodes: number;
  numberOfSeasons: number;
  originCountry: string;
  originalLanguage: string;
  originalTitle: string;
  popularity: number;
  posterImage: string;
  posterPath: string;
  releaseYear: string;
  seasons?: Season[];
  slug: string;
  status: Status;
  tagline: string;
  title: string;
  titleTreatmentImage?: string;
  voteAverage: number;
  voteCount: number;
}>;
