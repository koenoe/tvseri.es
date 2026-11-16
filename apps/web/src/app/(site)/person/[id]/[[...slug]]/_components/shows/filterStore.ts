'use client';

import { useCallback } from 'react';
import { create } from 'zustand';

import type { ShowFilter } from '../../_lib/shows';

/**
 * The Shows list's filter and Show all, shared with the Career chart: its
 * Guest roles row and "All N series" set the filter and open the list.
 * Per person id, so another person's page starts fresh.
 */
type State = Readonly<{
  personId: number | null;
  filter: ShowFilter;
  open: boolean;
  set: (
    personId: number,
    change: Partial<Pick<State, 'filter' | 'open'>>,
  ) => void;
}>;

const useStore = create<State>()((set, get) => ({
  filter: 'all',
  open: false,
  personId: null,
  set: (personId, change) => {
    const current = get();
    const base =
      current.personId === personId
        ? current
        : { filter: 'all' as const, open: false };
    set({ filter: base.filter, open: base.open, personId, ...change });
  },
}));

export function useShowsFilter(personId: number) {
  const filter = useStore((state) =>
    state.personId === personId ? state.filter : 'all',
  );
  const open = useStore((state) =>
    state.personId === personId ? state.open : false,
  );
  const set = useStore((state) => state.set);
  return { filter, open, set };
}

/** Shows the list filtered and open, and scrolls to it. */
export function useOpenShows(personId: number) {
  const set = useStore((state) => state.set);
  return useCallback(
    (filter: ShowFilter) => {
      set(personId, { filter, open: true });
      document
        .getElementById('person-shows')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    [personId, set],
  );
}
