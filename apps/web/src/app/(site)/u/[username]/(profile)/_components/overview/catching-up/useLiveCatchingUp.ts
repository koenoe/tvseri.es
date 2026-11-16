'use client';

import type { CatchingUpItem } from '@tvseri.es/schemas';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useTransition } from 'react';

import { useSeriesView } from '@/lib/marking/hooks';
import { useMarkingStoreApi } from '@/lib/marking/MarkingProvider';
import type { MarkingState } from '@/lib/marking/store';
import { liveCatchingUp, needsFreshRun } from './live';

/**
 * A Catching up row as the marking store has its show now (`liveCatchingUp`:
 * marks move the run on, a rollback or an Undo moves it back, no state of
 * its own), and the overview read again (`router.refresh()`, as the lane's
 * other answers do) once the show's settled marks leave the server's item
 * behind (`needsFreshRun`): the run's chips, the Remote, the show page in
 * the same tab, an Undo after a refresh. It watches the store's settled
 * truth (`base`, with no write still out), so the overview it reads has
 * the write (a mark's request writes the show's summary). One refresh per
 * item and state: an overview that has nothing new yet isn't read again.
 */
export default function useLiveCatchingUp(item: CatchingUpItem) {
  const view = useSeriesView(item.seriesId);
  const store = useMarkingStoreApi();
  const router = useRouter();
  const [, startRefresh] = useTransition();
  const refreshedFor = useRef<string | null>(null);
  const live = useMemo(() => liveCatchingUp(item, view), [item, view]);

  // a subscription to the marking store (an external store): no render
  // depends on it, it only asks the router for the overview again
  useEffect(() => {
    const check = (state: MarkingState) => {
      const entry = state.series[item.seriesId];
      if (!entry || entry.pending.length > 0) {
        return;
      }
      if (!needsFreshRun(item, entry.base)) {
        return;
      }
      const settled = liveCatchingUp(item, entry.base);
      const key = `${item.episodes.join()}/${item.waiting}>${settled?.episodes.join() ?? ''}/${settled?.waiting ?? 0}`;
      if (refreshedFor.current === key) {
        return;
      }
      refreshedFor.current = key;
      startRefresh(() => router.refresh());
    };
    check(store.getState());
    return store.subscribe(check);
  }, [item, router, store]);

  return live;
}
