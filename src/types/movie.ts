import type { Genre } from './genre';

export type Movie = Readonly<{
  backdropColor: string;
  backdropImage?: string;
  description: string;
  genres: Genre[];
  id: number;
  imdbId: string;
  originalLanguage: string;
  originalTitle: string;
  posterImage: string;
  releaseDate: string;
  runtime: number;
  tagline: string;
  title: string;
  titleTreatmentImage?: string;
}>;
