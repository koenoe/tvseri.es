import type { Genre } from './genre';

export type Movie = Readonly<{
  id: number;
  imdbId: string;
  title: string;
  originalTitle: string;
  tagline: string;
  genres: Genre[];
  releaseDate: string;
  runtime: number;
  posterImage?: string;
  backdropImage?: string;
  titleTreatmentImage?: string;
}>;
