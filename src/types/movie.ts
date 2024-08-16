import { type Genre } from './genre';

type Language = Readonly<{
  englishName: string;
  name: string;
  code: string;
}>;

type Country = Readonly<{
  name: string;
  code: string;
}>;

export type Movie = Readonly<{
  backdropColor: string;
  backdropImage?: string;
  description: string;
  genres: Genre[];
  id: number;
  isAdult: boolean;
  imdbId: string;
  languages: Language[];
  countries: Country[];
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
