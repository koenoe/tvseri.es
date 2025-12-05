import type { Movie, Person, TvSeries } from '@tvseri.es/schemas';

import { apiFetch } from './client';

export async function fetchPerson(id: number | string) {
  const person = (await apiFetch(`/person/${id}`)) as Person | undefined;
  return person;
}

export async function fetchPersonTvCredits(id: number | string) {
  const credits = (await apiFetch(`/person/${id}/credits`)) as Readonly<{
    cast: {
      upcoming: TvSeries[];
      previous: TvSeries[];
    };
    crew: {
      upcoming: TvSeries[];
      previous: TvSeries[];
    };
  }>;
  return credits;
}

export async function fetchPersonKnownFor(id: number | string) {
  const items = (await apiFetch(`/person/${id}/known-for`)) as (
    | TvSeries
    | Movie
  )[];
  return items;
}
