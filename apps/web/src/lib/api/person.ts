import type { Movie, Person, TvSeries } from '@tvseri.es/schemas';
import { cacheLife, cacheTag } from 'next/cache';

import { apiFetch } from './client';
import { withStringId } from './withStringId';

// Uncached on purpose: `@/app/cached` wraps this with `use cache`.
export async function fetchPerson(id: number | string) {
  return apiFetch<Person>(`/person/${id}`, { notFound: 'null' });
}

async function fetchCachedPersonTvCredits(id: string) {
  'use cache';
  cacheLife('medium');
  cacheTag(`person:${id}`);
  return apiFetch<
    Readonly<{
      cast: {
        upcoming: TvSeries[];
        previous: TvSeries[];
      };
      crew: {
        upcoming: TvSeries[];
        previous: TvSeries[];
      };
    }>
  >(`/person/${id}/credits`);
}

export const fetchPersonTvCredits = withStringId(fetchCachedPersonTvCredits);

async function fetchCachedPersonKnownFor(id: string) {
  'use cache';
  cacheLife('medium');
  cacheTag(`person:${id}`);
  const items = await apiFetch<(TvSeries | Movie)[]>(
    `/person/${id}/known-for`,
    { notFound: 'null' },
  );
  return items ?? [];
}

export const fetchPersonKnownFor = withStringId(fetchCachedPersonKnownFor);
