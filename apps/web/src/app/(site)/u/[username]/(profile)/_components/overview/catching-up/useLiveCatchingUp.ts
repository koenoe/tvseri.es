'use client';

import type { CatchingUpItem } from '@tvseri.es/schemas';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useTransition } from 'react';

import { useSeriesView } from '@/lib/marking/hooks';
import { useMarkingStoreApi } from '@/lib/marking/MarkingProvider';
import { liveCatchingUp, needsFreshRun } from './live';

/**
 * A Catching up row as the marking store has its show now (`liveCatchingUp`:
 * marks move the run on, a rollback or an Undo moves it back, no state of
 * its own), and what to do once a mark settles: when the marks used up the
 * episodes the API sent, or took the show out of Catching up, the page reads
 * the overview again (`router.refresh()`, as the lane's other answers do).
 * Asked after the write settled, never from an effect: a mark's request
 * writes the show's summary, so the overview it reads is the new one.
 */
export default function useLiveCatchingUp(item: CatchingUpItem) {
  const view = useSeriesView(item.seriesId);
  const store = useMarkingStoreApi();
  const router = useRouter();
  const [, startRefresh] = useTransition();
  const live = useMemo(() => liveCatchingUp(item, view), [item, view]);
  const onMarked = useCallback(() => {
    const now = store.getState().series[item.seriesId]?.view;
    if (needsFreshRun(item, now)) {
      startRefresh(() => router.refresh());
    }
  }, [item, router, store]);
  return { live, onMarked } as const;
}
