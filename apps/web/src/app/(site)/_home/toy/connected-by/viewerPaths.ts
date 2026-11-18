import type { ConnectedPath, LibraryIds, TvSeries } from '@tvseri.es/schemas';
import { rotationIndex } from '@tvseri.es/utils';

import { isNewToViewer } from '@/lib/marking/librarySets';

/**
 * Connected by's paths read as shows (plain, no server-only: unit-tested):
 * a path's two ends, where a viewer's path starts and which of that
 * start's paths they get.
 */

/** The paths the card steps through with "Another path" */
const PATHS_SHOWN = 3;

const showsOf = (path: ConnectedPath): TvSeries[] =>
  path.nodes.flatMap((node) => (node.type === 'show' ? [node.series] : []));

/** The show a path starts at */
export const startOf = (path: ConnectedPath): TvSeries | undefined =>
  showsOf(path)[0];

/** The show a path ends at: the one to discover */
export const endOf = (path: ConnectedPath): TvSeries | undefined =>
  showsOf(path).at(-1);

/**
 * The viewer's start: one of their finished shows, a different one each
 * day (date-pure, so the day's paths are one shared read); without one a
 * favourite, then a show in progress; none for an empty library.
 */
export function viewerStart(ids: LibraryIds, day: string): number | undefined {
  for (const pool of [ids.watched, ids.favorites, ids.inProgress]) {
    if (pool.length > 0) {
      return pool[rotationIndex(day, pool.length, 'connected-start')];
    }
  }
  return undefined;
}

/**
 * The first paths whose end is in none of the viewer's lists (watching,
 * finished, watchlist, favourites: `isNewToViewer`). The shows on the way
 * may be theirs: only the end is the suggestion.
 */
export function unseenPaths(
  paths: ReadonlyArray<ConnectedPath>,
  ids: LibraryIds,
): ReadonlyArray<ConnectedPath> {
  return paths
    .filter((path) => {
      const end = endOf(path);
      return end !== undefined && isNewToViewer(ids, end.id);
    })
    .slice(0, PATHS_SHOWN);
}
