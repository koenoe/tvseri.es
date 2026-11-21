'use client';

import type { LibraryCounts, LibraryShelf } from '@tvseri.es/schemas';
import { useState } from 'react';
import { create } from 'zustand';

type Change = Readonly<Partial<Record<LibraryShelf, number>>>;

type Entry = Readonly<{
  change: Change;
  /** The shelf a show moved onto because of a mark made here (N finishing it) */
  landed?: LibraryShelf;
  seq: number;
  username: string;
}>;

/**
 * Shelf count changes made on this page (a removal, a hide, a bulk action):
 * the nav, the chips and the header (server renders in their own slots) add
 * the ones made after they got their counts, so a fresh render (which
 * already holds them) drops them by itself.
 */
const useCountChanges = create<
  Readonly<{ entries: ReadonlyArray<Entry>; seq: number }>
>()(() => ({ entries: [], seq: 0 }));

/**
 * Adds to a profile's shelf counts: `{ watchlist: -4 }`; `landed` is the
 * shelf a mark made here moved the show onto (`useShelfLanding`)
 */
export function bumpCounts(
  username: string,
  change: Change,
  landed?: LibraryShelf,
): void {
  useCountChanges.setState(({ entries, seq }) => ({
    // the last few hundred changes are plenty for one page's life
    entries: [
      ...entries.slice(-200),
      { change, landed, seq: seq + 1, username },
    ],
    seq: seq + 1,
  }));
}

/** What `username`'s changes after `since` add to each shelf */
function sumSince(
  entries: ReadonlyArray<Entry>,
  username: string,
  since: number,
): Change {
  const sum: Partial<Record<LibraryShelf, number>> = {};
  for (const entry of entries) {
    if (entry.username !== username || entry.seq <= since) {
      continue;
    }
    for (const [shelf, by] of Object.entries(entry.change) as [
      LibraryShelf,
      number,
    ][]) {
      sum[shelf] = (sum[shelf] ?? 0) + by;
    }
  }
  return sum;
}

/**
 * The last change made before `from` arrived: changes after it count
 * (server counts that are another value start over, as they already hold
 * the earlier ones).
 */
function useSince<T>(from: T): number {
  const [since, setSince] = useState(() => ({
    from,
    seq: useCountChanges.getState().seq,
  }));
  if (!Object.is(since.from, from)) {
    setSince({ from, seq: useCountChanges.getState().seq });
  }
  return since.seq;
}

/**
 * One shelf's count from the server plus the changes made since it arrived:
 * the profile sidebar's "N finished" reads the Finished shelf's number, so
 * the two never disagree on one screen. Re-renders only when that number
 * moves.
 */
export function useShelfCount(
  username: string,
  shelf: LibraryShelf,
  count: number,
): number {
  const since = useSince(count);
  const by = useCountChanges(
    (state) => sumSince(state.entries, username, since)[shelf] ?? 0,
  );
  return Math.max(0, count + by);
}

/**
 * `counts` from the server plus the changes made since they arrived; new
 * server counts (another object) start over.
 */
export function useShelfCounts(
  username: string,
  counts: LibraryCounts | null,
): LibraryCounts | null {
  const since = useSince(counts);
  const entries = useCountChanges((state) => state.entries);
  if (!counts) {
    return null;
  }
  const sum = sumSince(entries, username, since);
  const add = (shelf: LibraryShelf, value: number) =>
    Math.max(0, value + (sum[shelf] ?? 0));
  return {
    all: add('all', counts.all),
    favourites: add('favourites', counts.favourites),
    finished: add('finished', counts.finished),
    hidden: counts.hidden === null ? null : add('hidden', counts.hidden),
    watching: add('watching', counts.watching),
    watchlist: add('watchlist', counts.watchlist),
  };
}

/**
 * The last time a mark made here moved one of `username`'s shows onto
 * `shelf` after this mounted, as a key (0: none yet): the sidebar's
 * "N finished" rings once for each. Earlier landings, an Undo (which takes
 * the counts back) and a fresh render never play it.
 */
export function useShelfLanding(username: string, shelf: LibraryShelf): number {
  const [since] = useState(() => useCountChanges.getState().seq);
  return useCountChanges((state) => {
    for (let index = state.entries.length - 1; index >= 0; index -= 1) {
      const entry = state.entries[index];
      if (!entry || entry.seq <= since) {
        return 0;
      }
      if (entry.username === username && entry.landed === shelf) {
        return entry.seq;
      }
    }
    return 0;
  });
}
