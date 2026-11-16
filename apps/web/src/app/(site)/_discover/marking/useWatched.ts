'use client';

import { useLibrarySelect } from '@/lib/marking/hooks';
import { librarySets } from '@/lib/marking/librarySets';

/*
 * The viewer's watched shows for cached tiles: from the library ids, loaded
 * once per tab on the client after hydration (`useLibraryIds`) and kept
 * current by every mark. Each hook reads one primitive answer, so a mark
 * re-renders only the tiles and lines whose answer changed, not every tile
 * on the page. `false` / 0 while loading, on the server and signed out.
 */

/** Whether the viewer has watched the show */
export function useIsWatched(id: number): boolean {
  return useLibrarySelect((ids) => librarySets(ids).watched.has(id), false);
}

/** How many of `ids` the viewer has watched */
export function useWatchedCount(ids: ReadonlyArray<number>): number {
  return useLibrarySelect((library) => {
    const { watched } = librarySets(library);
    return ids.filter((id) => watched.has(id)).length;
  }, 0);
}
