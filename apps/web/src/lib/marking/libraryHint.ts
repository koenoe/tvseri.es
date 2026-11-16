import type { LibraryIds } from '@tvseri.es/schemas';

import { readDisplayUsername } from '@/components/menu/displayCookie';
import { LIBRARY_HINT_KEY, LIBRARY_HINT_VERSION } from '@/lib/viewer/htmlHints';

import type { MarkingStoreApi } from './store';

/** Most ids kept: a library past this keeps its most recent (the last in each list). */
const MAX_HINT_IDS = 5000;

/**
 * The stored hint: ids only, versioned, for one account. A show is tracked
 * when it has watched episodes or is in progress.
 */
export function toLibraryHint(username: string, library: LibraryIds): string {
  const ids = [...new Set([...library.watched, ...library.inProgress])].slice(
    -MAX_HINT_IDS,
  );
  return JSON.stringify({ ids, u: username, v: LIBRARY_HINT_VERSION });
}

/**
 * Keeps the localStorage hint current with the store's library ids (loaded
 * once per tab, updated by marks): written whenever they change, removed
 * when the viewer is signed out. Every access can throw (private mode,
 * blocked storage): then there is no hint and the page draws without one.
 * Returns the unsubscribe.
 */
export function persistLibraryHint(store: MarkingStoreApi): () => void {
  let last: unknown;
  return store.subscribe((state) => {
    const { library } = state;
    if (library === last) {
      return;
    }
    last = library;
    try {
      if (library.status === 'signed-out') {
        window.localStorage.removeItem(LIBRARY_HINT_KEY);
        return;
      }
      const username = readDisplayUsername(document.cookie);
      if (library.status === 'ready' && username) {
        window.localStorage.setItem(
          LIBRARY_HINT_KEY,
          toLibraryHint(username, library.ids),
        );
      }
    } catch {
      // no storage, no hint
    }
  });
}
