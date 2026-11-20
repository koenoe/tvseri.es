'use client';

import type { LibraryIds, LibraryShelf } from '@tvseri.es/schemas';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { seriesProgress } from '@/lib/marking/progress';
import type { SeriesBase } from '@/lib/marking/types';
import type { TileView } from '@/lib/profile/tileView';
import { bumpCounts } from '../../_lib/shelfCounts';

/** Why a tile leaves its shelf (the counts follow) */
export type LeaveReason =
  | 'favourites-remove'
  /** N marked the last aired episode: the show moves to Finished */
  | 'finished'
  | 'hide'
  /** Marked from the Watchlist shelf: the API parks its watchlist entry */
  | 'started'
  /** ...and every aired episode is done */
  | 'started-finished'
  | 'unhide'
  | 'watchlist-remove';

/** `marked`: a mark made on this page made the show leave (N finished it) */
export type LeaveHow = Readonly<{ marked?: boolean }>;

/** How each way of leaving moves the shelf counts */
const COUNT_CHANGE: Readonly<
  Record<LeaveReason, Partial<Record<LibraryShelf, number>>>
> = {
  'favourites-remove': { favourites: -1 },
  finished: { finished: 1, watching: -1 },
  hide: { hidden: 1, watching: -1 },
  started: { watching: 1, watchlist: -1 },
  'started-finished': { finished: 1, watchlist: -1 },
  unhide: { hidden: -1, watching: 1 },
  'watchlist-remove': { watchlist: -1 },
};

/**
 * Why a show is off the watchlist now; null: still on. A show on the
 * Watchlist shelf has nothing regular watched, so any in its store `view`
 * is a mark made here, which counts at once: the library ids follow only
 * once it saved, and the Remote can close before that.
 */
export function offWatchlistReason(
  ids: LibraryIds,
  id: number,
  view?: SeriesBase,
): LeaveReason | null {
  const progress = view ? seriesProgress(view) : null;
  if (progress && progress.watched > 0) {
    return progress.isFinished ? 'started-finished' : 'started';
  }
  if (ids.watchlist.includes(id)) {
    return null;
  }
  if (ids.inProgress.includes(id)) {
    return 'started';
  }
  return ids.watched.includes(id) ? 'started-finished' : 'watchlist-remove';
}

const reverse = (change: Partial<Record<LibraryShelf, number>>) =>
  Object.fromEntries(
    Object.entries(change).map(([shelf, by]) => [shelf, -(by ?? 0)]),
  );

/**
 * A shelf's tiles as they stand on this page: the loaded `items`
 * without the shows that left here (a Remote's W, F or H, N finishing a
 * show, a bulk action), and on Watching and Hidden as the marking store's
 * `hidden` says (a Remote Hide and its Undo write it at once). Leaving and
 * coming back move the shelf counts with them; the toast's Undo of a Hide
 * brings the tile and its counts back. A new first page (`first`, another
 * object) is a new list (`list`): nothing has left it.
 *
 * `moving` is true from a leave until the exits are done (`settled`): the
 * grid's layout animation runs only then.
 */
export default function useShelfTiles({
  first,
  hidden,
  items,
  shelf,
  username,
}: Readonly<{
  /** The server's first page: a new object is a new list */
  first: object;
  /** The store's hidden (`true`) and brought back (`false`) shows */
  hidden: Readonly<Record<number, boolean>>;
  items: ReadonlyArray<TileView>;
  shelf: LibraryShelf;
  username: string;
}>) {
  const [left, setLeft] = useState<ReadonlyMap<number, LeaveReason>>(
    () => new Map(),
  );
  const [seed, setSeed] = useState({ first, list: 0 });
  if (seed.first !== first) {
    setSeed({ first, list: seed.list + 1 });
    setLeft(new Map());
  }
  const [moving, setMoving] = useState(false);

  const tiles = useMemo(
    () =>
      items.filter((tile) => {
        const state = hidden[tile.id];
        const reason = left.get(tile.id);
        // The store's hide state wins over a Hide or Unhide leaving (its
        // Undo); any other leave (N finishing the show) still stands
        if (
          state !== undefined &&
          (shelf === 'watching' || shelf === 'hidden') &&
          (reason === undefined || reason === 'hide' || reason === 'unhide')
        ) {
          return shelf === 'watching' ? !state : state;
        }
        return reason === undefined;
      }),
    [hidden, items, left, shelf],
  );

  const leave = useCallback(
    (ids: ReadonlyArray<number>, reason: LeaveReason, how?: LeaveHow) => {
      setMoving(true);
      setLeft(
        (was) => new Map([...was, ...ids.map((id) => [id, reason] as const)]),
      );
      // Only N finishing the show here lands it on Finished (the sidebar's
      // count rings): never a show the store first had finished
      const landed =
        reason === 'finished' && how?.marked ? 'finished' : undefined;
      for (const _ of ids) {
        bumpCounts(username, COUNT_CHANGE[reason], landed);
      }
    },
    [username],
  );
  const comeBack = useCallback(
    (ids: ReadonlyArray<number>, reason: LeaveReason) => {
      setLeft((was) => new Map([...was].filter(([id]) => !ids.includes(id))));
      const back = reverse(COUNT_CHANGE[reason]);
      for (const _ of ids) {
        bumpCounts(username, back);
      }
    },
    [username],
  );

  // the toast's Undo of a Remote Hide (or Unhide) brings the tile back: its counts too
  useEffect(() => {
    for (const [id, reason] of left) {
      const state = hidden[id];
      if (
        (reason === 'hide' && state === false) ||
        (reason === 'unhide' && state === true)
      ) {
        comeBack([id], reason);
      }
    }
  }, [comeBack, hidden, left]);

  const settled = useCallback(() => setMoving(false), []);

  return {
    comeBack,
    leave,
    list: seed.list,
    moving,
    settled,
    tiles,
  } as const;
}
