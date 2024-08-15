import { type Genre } from './genre';

export type Movie = Readonly<{
  backdropColor: string;
  backdropImage?: string;
  description: string;
  genres: Genre[];
  id: number;
  isAdult: boolean;
  imdbId: string;
  originalLanguage: string;
  originalTitle: string;
  posterImage: string;
  releaseDate: string;
  runtime: number;
  slug: string;
  tagline: string;
  title: string;
  titleTreatmentImage?: string;
  voteAverage: number;
  voteCount: number;
}>;
