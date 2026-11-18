'use client';

import {
  markEpisodes,
  markNextEpisode,
  markScope,
  removeFromInProgress,
  restoreToInProgress,
  setInList,
  unmarkEpisodes,
  unmarkScope,
  updateSeriesPrefs,
} from './actions';
import { isSignedInNow, showMarkingToast } from './clientDeps';
import { createMarkingCommands, type MarkingCommands } from './commands';
import { useMarkingStoreApi } from './MarkingProvider';
import promptSignIn from './promptSignIn';
import type { MarkingStoreApi } from './store';

// One command set per store, so merged toasts span every control on the page.
const commandsByStore = new WeakMap<MarkingStoreApi, MarkingCommands>();

/**
 * The marking commands (see `createMarkingCommands`): optimistic, one toast
 * with Undo, the sign-in prompt and the error toast. Stable per tab.
 *
 * @example
 * const marking = useMarking();
 * marking.toggleEpisode(seriesId, { seasonNumber: 3, episodeNumber: 5 }, { title: 'Children' });
 */
export default function useMarking(): MarkingCommands {
  const store = useMarkingStoreApi();
  let commands = commandsByStore.get(store);
  if (!commands) {
    commands = createMarkingCommands({
      actions: {
        markEpisodes,
        markNextEpisode,
        markScope,
        removeFromInProgress,
        restoreToInProgress,
        setInList,
        unmarkEpisodes,
        unmarkScope,
        updateSeriesPrefs,
      },
      isSignedIn: isSignedInNow,
      now: () => Date.now(),
      promptSignIn,
      store,
      toast: showMarkingToast,
    });
    commandsByStore.set(store, commands);
  }
  return commands;
}
