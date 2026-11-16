'use client';

import { createContext, type ReactNode, use, useMemo } from 'react';

import { useEnsureSeries, useNextEpisode } from '@/lib/marking/hooks';
import { useMarkingStore } from '@/lib/marking/MarkingProvider';
import type { MarkingStore } from '@/lib/marking/store';
import { useListToggle } from '@/lib/marking/toggles';
import useMarking from '@/lib/marking/useMarking';

import type { EpisodeRef, ListStatus, MarkingList } from './types';

/**
 * The Remote's seam to the marking core (`lib/marking`): everything the Remote reads or changes about a show. The core
 * owns optimism, every toast (the mark with Undo, errors, the sign-in prompt
 * when signed out) and the API; the Remote never toasts.
 */
export type RemoteMarking = Readonly<{
  /** Next up; null when nothing is left to mark; undefined while unknown (unseeded). */
  nextEpisode: EpisodeRef | null | undefined;
  /** The lists; null while unknown (signed out). */
  status: ListStatus | null;
  /** A list toggle still waiting for the server (the key's pending ring). */
  listPending: Readonly<Record<MarkingList, boolean>>;
  /** Marks Next up, Just now. Resolves at once on a seeded show, else when the server answered. */
  markNext: () => Promise<unknown>;
  toggleList: (list: MarkingList) => void;
  /** Hide from in progress (the tile's H). */
  hide: () => void;
  /** Back to in progress (the Hidden shelf's latched H). */
  restore?: () => void;
}>;

/** A hook, called by the Remote's keys while it is open, with the show's id. */
export type UseRemoteMarking = (seriesId: number) => RemoteMarking;

const RemoteMarkingContext = createContext<UseRemoteMarking | null>(null);

/**
 * Injects another adapter (the style guide's and the tests' fakes). `value`
 * must be a stable, module-level hook.
 */
export function RemoteMarkingProvider({
  children,
  value,
}: Readonly<{ children: ReactNode; value: UseRemoteMarking }>) {
  return <RemoteMarkingContext value={value}>{children}</RemoteMarkingContext>;
}

const listPendingOf =
  (seriesId: number, list: MarkingList) => (state: MarkingStore) =>
    Boolean(
      state.series[seriesId]?.pending.some(
        ({ op }) => op.kind === 'list' && op.list === list,
      ),
    );

/** The marking core behind the seam. */
const useCoreMarking: UseRemoteMarking = (seriesId) => {
  const marking = useMarking();
  // a tile's show may not be seeded: fetched once, when the Remote opens
  useEnsureSeries(seriesId, true);
  const nextEpisode = useNextEpisode(seriesId);
  // the core's toggle: seeded status, else the library ids
  const favorites = useListToggle(seriesId, 'favorites');
  const watchlist = useListToggle(seriesId, 'watchlist');
  const favoritesPending = useMarkingStore(
    listPendingOf(seriesId, 'favorites'),
  );
  const watchlistPending = useMarkingStore(
    listPendingOf(seriesId, 'watchlist'),
  );
  const status = useMemo<ListStatus>(
    () => ({ isFavorited: favorites.isOn, isWatchlisted: watchlist.isOn }),
    [favorites.isOn, watchlist.isOn],
  );
  const toggleFavorites = favorites.toggle;
  const toggleWatchlist = watchlist.toggle;
  return useMemo(
    () => ({
      hide: () => marking.removeFromInProgress(seriesId),
      listPending: { favorites: favoritesPending, watchlist: watchlistPending },
      markNext: () => marking.markNext(seriesId),
      nextEpisode,
      restore: () => marking.restoreToInProgress(seriesId),
      status,
      toggleList: (list: MarkingList) =>
        list === 'favorites' ? toggleFavorites() : toggleWatchlist(),
    }),
    [
      favoritesPending,
      marking,
      nextEpisode,
      seriesId,
      status,
      toggleFavorites,
      toggleWatchlist,
      watchlistPending,
    ],
  );
};

/** The adapter for one show: the injected one, else the marking core. */
export function useRemoteMarking(seriesId: number): RemoteMarking {
  const useAdapter = use(RemoteMarkingContext) ?? useCoreMarking;
  return useAdapter(seriesId);
}
