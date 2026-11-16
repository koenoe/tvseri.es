import 'server-only';

import type {
  ListItemFacts,
  ListItemWithFacts,
  TvSeries,
} from '@tvseri.es/schemas';

import { apiFetch } from '@/lib/api/client';
import { readCount } from '@/lib/profile/counts';
import { loadSeriesOrNull } from '@/lib/series/loaders';

import { type Profile, withToken } from '../../../_data/profile';

type ListPage = Readonly<{ items: ReadonlyArray<ListItemWithFacts> }>;

/** One tile: the row, its facts and the show for its title treatment */
export type Tile = Readonly<{
  facts: ListItemFacts | null;
  item: ListItemWithFacts;
  series: TvSeries | null;
}>;

/** The first `limit` shows of a list with their facts (favourites, or finished for the empty picks) */
async function loadList(
  profile: Profile,
  list: 'favorites' | 'watched',
  limit: number,
): Promise<ReadonlyArray<Tile>> {
  const page = await apiFetch<ListPage>('/user/:id/list/:list', {
    ...withToken(profile),
    params: { id: profile.user.id, list },
    query: { include: 'facts', limit },
  });
  const items = page.items.slice(0, limit);
  const series = await Promise.all(
    items.map((item) => loadSeriesOrNull(item.id)),
  );
  return items.map((item, index) => ({
    facts: item.facts,
    item,
    series: series[index] ?? null,
  }));
}

/**
 * Five tiles, on your own profile and on someone else's (three for
 * a visitor read as "this person has three favourites")
 */
export const loadFavourites = (profile: Profile) =>
  loadList(profile, 'favorites', 5);

/** Shows the owner finished, to pick favourites from */
export const loadFinished = (profile: Profile) =>
  loadList(profile, 'watched', 4);

/** "98 ›": how many favourites */
export const loadFavouriteCount = (profile: Profile): Promise<number> =>
  readCount(profile.user.id, 'favourites');
