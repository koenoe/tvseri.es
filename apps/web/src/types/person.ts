export type Person = Readonly<{
  biography?: string;
  birthdate?: string;
  character: string;
  deathdate?: string;
  numberOfEpisodes: number;
  id: number;
  image: string;
  imdbId?: string;
  isAdult?: boolean;
  job: string;
  knownForDepartment?: string;
  name: string;
  placeOfBirth?: string;
  slug: string;
  age?: number;
}>;
