'use client';

import { useMemo } from 'react';

import { readDisplayUsername } from '@/auth/displayUsername';
import { showToast } from '@/components/ui/toast/showToast';
import type { MarkingCommands } from '@/lib/marking/commands';
import { ERROR_MESSAGE } from '@/lib/marking/copy';
import { ensureSeries } from '@/lib/marking/ensureSeries';
import { useMarkingStoreApi } from '@/lib/marking/MarkingProvider';
import promptSignIn from '@/lib/marking/promptSignIn';
import type { MarkingStoreApi } from '@/lib/marking/store';
import useMarking from '@/lib/marking/useMarking';

/**
 * Show-level marking actions for controls on cached pages. "Seen it" marks
 * what is open with no date (`markSeen`), so this year's stats and history
 * stay untouched, and never unmarks: a second click, or a show already
 * watched, changes nothing. The watchlist press adds or removes. Each waits
 * for the show's marking state (`ensureSeries`, usually fetched on hover by
 * `prepare`), so it decides from the server's state. Signed out, a click
 * asks to sign in.
 */

export type ShowRef = Readonly<{ id: number; title: string }>;

export type ShowActions = Readonly<{
  markShowWatched: (show: ShowRef) => void;
  /** Fetch a show's marking state ahead of a click (hover, focus) */
  prepare: (seriesId: number) => void;
  /** Adds to the watchlist, or removes a show that is on it */
  toggleWatchlist: (show: ShowRef) => void;
}>;

const isSignedIn = () => readDisplayUsername(document.cookie) !== null;

/**
 * The actions, one object per marking store (stable across renders, so a
 * caller's `useCallback` over them holds).
 */
export function useShowActions(): ShowActions {
  const marking = useMarking();
  const store = useMarkingStoreApi();
  return useMemo(() => createShowActions(marking, store), [marking, store]);
}

function createShowActions(
  marking: MarkingCommands,
  store: MarkingStoreApi,
): ShowActions {
  // The core's commands need the show's state for an optimistic mark;
  // cached tiles don't seed it, so fetch it first (usually done on hover)
  const whenSeeded = async (seriesId: number, mark: () => unknown) => {
    if (!isSignedIn()) {
      promptSignIn();
      return;
    }
    if (await ensureSeries(store, seriesId)) {
      return mark();
    }
    showToast({ title: ERROR_MESSAGE, tone: 'error' });
  };
  return {
    markShowWatched: (show) => {
      void whenSeeded(show.id, () => marking.markSeen(show.id, show.title));
    },
    prepare: (seriesId) => {
      if (isSignedIn()) {
        void ensureSeries(store, seriesId);
      }
    },
    toggleWatchlist: (show) => {
      if (!isSignedIn()) {
        promptSignIn();
        return;
      }
      // with the show's state the press decides from the server's truth;
      // without it (a failed read) the library ids decide, as they can
      void ensureSeries(store, show.id).then(() =>
        marking.toggleList(show.id, 'watchlist', show.title),
      );
    },
  };
}
