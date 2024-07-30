import type { Genre } from './genre';

export type Movie = Readonly<{
  id: number;
  imdbId: string;
  title: string;
  originalTitle: string;
  tagline: string;
  genres: Genre[];
  releaseDate: string;
  releaseYear: number;
  runtime: number;
  posterImage?: string;
  backdropImage?: string;
  backdropColor: string;
  titleTreatmentImage?: string;
}>;
