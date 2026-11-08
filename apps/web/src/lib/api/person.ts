import type { Movie, Person, TvSeries } from '@tvseri.es/schemas';
import { cacheLife, cacheTag } from 'next/cache';
import { type PosterItem, toPosterItem } from '@/utils/toPosterItem';

import { apiFetch } from './client';
import { withStringId } from './withStringId';

// Uncached on purpose: `@/app/cached` wraps this with `use cache`.
export async function fetchPerson(id: number | string) {
  return apiFetch<Person>(`/person/${id}`, { notFound: 'null' });
}

type CreditsDepartment = 'cast' | 'crew';

/**
 * Only one side is rendered (cast for actors, crew for everyone else), so the
 * department is part of the key and the entry keeps just that side.
 */
async function fetchCachedPersonTvCredits(
  id: string,
  department: CreditsDepartment,
) {
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
  const credits = department === 'cast' ? cast : crew;
  // Credits are only shown as posters
  return {
    previous: credits.previous.map(toPosterItem),
    upcoming: credits.upcoming.map(toPosterItem),
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
