import type { LibraryIds } from '@tvseri.es/schemas';

import { librarySets } from '@/lib/marking/librarySets';

/** What someone's show is to the person looking */
export type Relation = 'both-love' | 'new' | 'seen' | 'watching' | 'watchlist';

export const RELATION_LABEL: Readonly<Record<Relation, string>> = {
  'both-love': 'You both love this',
  new: 'New to you',
  seen: 'You’ve seen it',
  watching: 'You’re watching it',
  watchlist: 'On your watchlist',
};

/**
 * One relation per show, strongest first, from the viewer's library ids.
 * "You both love this" needs the owner's favourite too: the overview's
 * Favourites block is all favourites (the default), a Library tile passes
 * its own `on.favourite`. Otherwise a viewer's favourite reads as seen.
 */
export function relationOf(
  ids: LibraryIds,
  seriesId: number,
  { ownerFavourite = true }: Readonly<{ ownerFavourite?: boolean }> = {},
): Relation {
  const sets = librarySets(ids);
  if (sets.favorites.has(seriesId)) {
    return ownerFavourite ? 'both-love' : 'seen';
  }
  if (sets.watched.has(seriesId)) {
    return 'seen';
  }
  if (sets.inProgress.has(seriesId)) {
    return 'watching';
  }
  if (sets.watchlist.has(seriesId)) {
    return 'watchlist';
  }
  return 'new';
}
