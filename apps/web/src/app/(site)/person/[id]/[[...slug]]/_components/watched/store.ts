'use client';

import type { PersonWatchedItem } from '@tvseri.es/schemas';
import { create } from 'zustand';

import { type CreditWatched, creditWatched } from '../../_lib/watched';

/**
 * The viewer's watched credits for the person on screen. The private hole
 * (`WatchedHole`) seeds it on the client; the cached Career and Shows read
 * it per credit, so the shell stays the same for everyone. Written only in
 * the browser (a layout effect), never during a server render.
 */
type State = Readonly<{
  personId: number | null;
  items: ReadonlyMap<number, PersonWatchedItem>;
  seed: (personId: number, items: ReadonlyArray<PersonWatchedItem>) => void;
}>;

export const useWatchedStore = create<State>()((set) => ({
  items: new Map(),
  personId: null,
  seed: (personId, items) =>
    set({
      items: new Map(items.map((item) => [item.seriesId, item])),
      personId,
    }),
}));

/** The viewer's mark for one credit; undefined signed out or unwatched. */
export function useCreditWatched(
  personId: number,
  seriesId: number,
): (CreditWatched & Readonly<{ fraction: number }>) | undefined {
  const item = useWatchedStore((state) =>
    state.personId === personId ? state.items.get(seriesId) : undefined,
  );
  if (!item) {
    return undefined;
  }
  const label = creditWatched(item);
  const fraction = label.complete
    ? 1
    : item.episodeCount > 0
      ? Math.min(1, item.episodesWatched / item.episodeCount)
      : 0;
  return { ...label, fraction };
}

/** Whether the viewer's marks for this person have arrived (signed in). */
export const useHasWatched = (personId: number) =>
  useWatchedStore((state) => state.personId === personId);
