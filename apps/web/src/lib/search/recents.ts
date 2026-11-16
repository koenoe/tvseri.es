import * as v from 'valibot';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { SearchCell } from './sections';

/** “Recent”: the last four things opened from search. */
export const MAX_RECENTS = 4;

/** `list` with `cell` first: one entry per show or person, the last four, only what a chip draws. */
export function withRecent(
  list: ReadonlyArray<SearchCell>,
  cell: SearchCell,
): ReadonlyArray<SearchCell> {
  const { href, image, key, name } = cell;
  const entry: SearchCell =
    cell.kind === 'member'
      ? { href, image, key, kind: cell.kind, name }
      : { href, id: cell.id, image, key, kind: cell.kind, name };
  return [entry, ...list.filter((item) => item.key !== key)].slice(
    0,
    MAX_RECENTS,
  );
}

/** A path on this site: `/1396`, never `//host` or `/\\host` */
const SITE_PATH = /^\/(?![/\\])/;

const CHIP_FIELDS = {
  href: v.pipe(v.string(), v.regex(SITE_PATH)),
  image: v.string(),
  key: v.string(),
  name: v.string(),
};

const StoredCellSchema = v.variant('kind', [
  v.object({
    ...CHIP_FIELDS,
    id: v.number(),
    kind: v.picklist(['person', 'show']),
  }),
  v.object({ ...CHIP_FIELDS, kind: v.literal('member') }),
]);

/**
 * The recents a stored state holds: localStorage can hold anything (an older
 * shape, a hand edit), so only entries a chip can draw, linking within the
 * site, are kept; anything else is an empty list.
 */
export function readRecents(stored: unknown): ReadonlyArray<SearchCell> {
  if (typeof stored !== 'object' || stored === null || !('recents' in stored)) {
    return [];
  }
  const { recents } = stored;
  if (!Array.isArray(recents)) {
    return [];
  }
  return recents
    .filter((entry) => v.is(StoredCellSchema, entry))
    .slice(0, MAX_RECENTS);
}

type RecentsStore = Readonly<{
  add: (cell: SearchCell) => void;
  recents: ReadonlyArray<SearchCell>;
}>;

/** In this browser only (Zustand persist, localStorage); no network. */
export const useRecents = create<RecentsStore>()(
  persist(
    (set) => ({
      add: (cell) =>
        set((state) => ({ recents: withRecent(state.recents, cell) })),
      recents: [],
    }),
    {
      merge: (stored, current) => ({
        ...current,
        recents: readRecents(stored),
      }),
      name: 'tvseries-search-recents',
      partialize: (state) => ({ recents: state.recents }),
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
