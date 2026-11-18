import type { TvSeries } from './tv-series';

/** A person in the search panel: a round face, a name and what they're known for */
export type SearchPerson = Readonly<{
  id: number;
  image: string;
  knownFor: ReadonlyArray<string>;
  knownForDepartment?: string;
  name: string;
  slug: string;
}>;

/** `GET /search?q=`: shows and people, each best match first */
export type SearchResults = Readonly<{
  /** Which block holds the overall best match (it's listed first, Enter opens it) */
  best: 'people' | 'series' | null;
  people: ReadonlyArray<SearchPerson>;
  series: ReadonlyArray<TvSeries>;
}>;
