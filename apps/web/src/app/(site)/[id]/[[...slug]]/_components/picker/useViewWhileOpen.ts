'use client';

import { useCallback, useState } from 'react';

import {
  useMarkingStore,
  useMarkingStoreApi,
} from '@/lib/marking/MarkingProvider';
import type { MarkingStore } from '@/lib/marking/store';
import type { SeriesBase } from '@/lib/marking/types';

/**
 * The show's marks for a dialog that stays mounted once opened (so closing
 * plays its exit): live while it is open; closed, the view it closed on,
 * without a subscription, so marks made later on the page don't re-render
 * a dialog nobody sees.
 */
export default function useViewWhileOpen(
  seriesId: number,
  open: boolean,
): SeriesBase | undefined {
  const store = useMarkingStoreApi();
  const [closed, setClosed] = useState<
    Readonly<{ open: boolean; view: SeriesBase | undefined }>
  >({ open, view: undefined });
  if (closed.open !== open) {
    setClosed({
      open,
      view: open ? undefined : store.getState().series[seriesId]?.view,
    });
  }
  const select = useCallback(
    (state: MarkingStore) => (open ? state.series[seriesId]?.view : undefined),
    [open, seriesId],
  );
  const live = useMarkingStore(select);
  return open ? live : closed.view;
}
