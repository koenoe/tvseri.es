'use client';

import type { EpisodeRef } from '@tvseri.es/schemas';
import { useCallback } from 'react';

import { useEpisodeState, useLibrarySelect, useListStatus } from './hooks';
import { librarySets } from './librarySets';
import { isWatchedState } from './progress';
import type { EpisodeState } from './types';
import useMarking from './useMarking';

/**
 * The eye on any episode control (a tile's pill, a "Mark as watched" circle,
 * a chip): its state and the toggle. Pages draw the button their own way;
 * this is the behaviour (watched → unmark, otherwise mark Just now,
 * skipped included).
 *
 * @example
 * const eye = useEpisodeToggle(1396, { seasonNumber: 2, episodeNumber: 6 }, { title: 'Peekaboo' });
 * <button aria-pressed={eye.isWatched} onClick={(event) => pressMark(key, event, eye.toggle)}>…</button>
 */
export function useEpisodeToggle(
  seriesId: number,
  ref: EpisodeRef,
  options: Readonly<{ title?: string; where?: 'page' | 'sheet' }> = {},
): Readonly<{
  /** `undefined` until the show is seeded (draw the not-watched look). */
  state: EpisodeState | undefined;
  isWatched: boolean;
  /** Resolves when the write settled (for `pressMark`) */
  toggle: () => Promise<unknown>;
}> {
  const marking = useMarking();
  const state = useEpisodeState(seriesId, ref);
  const { episodeNumber, seasonNumber } = ref;
  const { title, where } = options;
  const toggle = useCallback(
    () =>
      marking.toggleEpisode(
        seriesId,
        { episodeNumber, seasonNumber },
        { title, where },
      ),
    [episodeNumber, marking, seasonNumber, seriesId, title, where],
  );
  return {
    isWatched: state ? isWatchedState(state) : false,
    state,
    toggle,
  };
}

/**
 * Heart (favourites) or bookmark (watchlist) for any show: on from the seeded
 * show, else from the viewer's library ids; optimistic, with rollback.
 */
export function useListToggle(
  seriesId: number,
  list: 'favorites' | 'watchlist',
  /** the show's title: the change gets a toast with Undo (`toggleList`) */
  announce?: string,
): Readonly<{ isOn: boolean; toggle: () => void }> {
  const marking = useMarking();
  const status = useListStatus(seriesId);
  const inLibrary = useLibrarySelect(
    (ids) => librarySets(ids)[list].has(seriesId),
    false,
  );
  const isOn = status
    ? list === 'favorites'
      ? status.isFavorited
      : status.isWatchlisted
    : inLibrary;
  const toggle = useCallback(() => {
    marking.toggleList(seriesId, list, announce);
  }, [announce, list, marking, seriesId]);
  return { isOn, toggle };
}
