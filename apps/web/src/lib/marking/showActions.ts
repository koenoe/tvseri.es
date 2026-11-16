'use client';

import { useMemo } from 'react';

import { readDisplayUsername } from '@/components/menu/displayCookie';
import { showToast } from '@/components/ui/toast/showToast';
import type { MarkingCommands } from '@/lib/marking/commands';
import { ERROR_MESSAGE } from '@/lib/marking/copy';
import { ensureSeries } from '@/lib/marking/ensureSeries';
import { useMarkingStoreApi } from '@/lib/marking/MarkingProvider';
import promptSignIn from '@/lib/marking/promptSignIn';
import type { MarkingStoreApi } from '@/lib/marking/store';
import useMarking from '@/lib/marking/useMarking';

/**
 * The marking actions of controls on cached pages (the marking controls),
 * on the marking core: "Seen it" marks the show seen with no date
 * (`markSeen`: what is open, "I don't remember", so this year's stats and
 * history stay untouched); the watchlist press adds or removes. "Seen it"
 * only ever marks: a second click, or a show the store already has as
 * watched, never unmarks anything. Each waits for the show's marking state (`ensureSeries`,
 * usually fetched on hover by `prepare`), so it decides from the server's
 * truth and the controls follow it at once. Signed out, a click asks to
 * sign in. Every action is optimistic with the core's toast and Undo.
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
