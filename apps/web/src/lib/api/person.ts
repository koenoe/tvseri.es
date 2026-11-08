import type { Movie, Person, TvSeries } from '@tvseri.es/schemas';
import { cacheLife, cacheTag } from 'next/cache';
import { type PosterItem, toPosterItem } from '@/utils/toPosterItem';

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
  const { cast, crew } = await apiFetch<
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
  // Credits are only shown as posters
  return {
    cast: {
      previous: cast.previous.map(toPosterItem),
      upcoming: cast.upcoming.map(toPosterItem),
    },
    crew: {
      previous: crew.previous.map(toPosterItem),
      upcoming: crew.upcoming.map(toPosterItem),
    },
  };
}

export const fetchPersonTvCredits = withStringId(fetchCachedPersonTvCredits);

type KnownForItem = PosterItem &
  Readonly<{
    mediaType: 'tv' | 'movie';
  }>;

async function fetchCachedPersonKnownFor(id: string) {
  'use cache';
  cacheLife('medium');
  cacheTag(`person:${id}`);
  const items = await apiFetch<(TvSeries | Movie)[]>(
    `/person/${id}/known-for`,
    { notFound: 'null' },
  );
  // Known-for items are only shown as posters; movies render without a link
  return (items ?? []).map(
    (item): KnownForItem => ({
      ...toPosterItem(item),
      mediaType: 'firstAirDate' in item ? 'tv' : 'movie',
    }),
  );
}

export const fetchPersonKnownFor = withStringId(fetchCachedPersonKnownFor);
