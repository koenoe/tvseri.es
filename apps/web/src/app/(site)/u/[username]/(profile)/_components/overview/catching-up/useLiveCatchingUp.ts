'use client';

import type { CatchingUpItem } from '@tvseri.es/schemas';
import { useEffect, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/shallow';

import {
  useMarkingStore,
  useMarkingStoreApi,
} from '@/lib/marking/MarkingProvider';
import type { MarkingState } from '@/lib/marking/store';
import useRouteRefresh from '@/lib/navigation/useRouteRefresh';
import { liveCatchingUp, needsFreshRun } from './live';

/**
 * The lane's Catching up items as the marking store has their shows now
 * (`liveCatchingUp`: marks move a run on, a rollback or an Undo moves it
 * back, no state of its own; `null` once nothing waits), and the overview
 * read again (`router.refresh()`, as the lane's other answers do) once a
 * show's settled marks leave the server's item behind (`needsFreshRun`):
 * the run's chips, the Remote, the show page in the same tab, an Undo
 * after a refresh. It watches the store's settled truth (`base`, with no
 * write still out), so the overview it reads has the write (a mark's
 * request writes the show's summary). One refresh per item and state: an
 * overview that has nothing new yet isn't read again. `items` must keep
 * its identity between renders.
 */
export default function useLiveCatchingUp(
  items: ReadonlyArray<CatchingUpItem>,
): ReadonlyArray<CatchingUpItem | null> {
  // the views of these items' shows only (shallow): a mark on another show
  // leaves the lane and its render alone
  const views = useMarkingStore(
    useShallow((state) =>
      items.map((item) => state.series[item.seriesId]?.view),
    ),
  );
  const store = useMarkingStoreApi();
  const [, refresh] = useRouteRefresh();
  const refreshedFor = useRef(new Map<number, string>());
  const live = useMemo(
    () => items.map((item, index) => liveCatchingUp(item, views[index])),
    [items, views],
  );

  // a subscription to the marking store (an external store): no render
  // depends on it, it only asks the router for the overview again
  useEffect(() => {
    const isStale = (item: CatchingUpItem, state: MarkingState) => {
      const entry = state.series[item.seriesId];
      if (!entry || entry.pending.length > 0) {
        return false;
      }
      if (!needsFreshRun(item, entry.base)) {
        return false;
      }
      const settled = liveCatchingUp(item, entry.base);
      const key = `${item.episodes.join()}/${item.waiting}>${settled?.episodes.join() ?? ''}/${settled?.waiting ?? 0}`;
      if (refreshedFor.current.get(item.seriesId) === key) {
        return false;
      }
      refreshedFor.current.set(item.seriesId, key);
      return true;
    };
    const check = (state: MarkingState) => {
      // every item is checked, so each one's state is noted once
      const stale = items.filter((item) => isStale(item, state));
      if (stale.length > 0) {
        refresh();
      }
    };
    check(store.getState());
    return store.subscribe(check);
  }, [items, refresh, store]);

  return live;
}
