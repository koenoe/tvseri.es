'use client';

import { bulkLibrary } from './actions';
import { type Bulk, createBulk } from './bulk';
import { isSignedInNow, showMarkingToast } from './clientDeps';
import { useMarkingStoreApi } from './MarkingProvider';
import promptSignIn from './promptSignIn';
import type { MarkingStoreApi } from './store';

const bulkByStore = new WeakMap<MarkingStoreApi, Bulk>();

/**
 * The Library's bulk actions (`createBulk`) on this tab's marking store:
 * stable per store, toasts in the core's slot.
 *
 * @example
 * const bulk = useBulk();
 * await bulk('watchlist-remove', [{ id: 136315, addedAt }], { onUndone: refresh });
 */
export default function useBulk(): Bulk {
  const store = useMarkingStoreApi();
  let bulk = bulkByStore.get(store);
  if (!bulk) {
    bulk = createBulk({
      bulkLibrary,
      isSignedIn: isSignedInNow,
      promptSignIn,
      store,
      toast: showMarkingToast,
    });
    bulkByStore.set(store, bulk);
  }
  return bulk;
}
