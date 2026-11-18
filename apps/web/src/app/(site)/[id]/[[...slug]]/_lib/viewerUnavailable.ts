'use client';

import { createContext, useCallback, useState } from 'react';
import { ensureSeries } from '@/lib/marking/ensureSeries';
import { useSeriesAnswer } from '@/lib/marking/hooks';
import { useMarkingStoreApi } from '@/lib/marking/MarkingProvider';
import type { SeriesBase } from '@/lib/marking/types';

/** Why a control is off while the viewer's marks are unknown (its title). */
export const UNAVAILABLE_REASON = 'Your progress didn’t load';

const isUnavailable = (view: SeriesBase | undefined) =>
  view?.unavailable === true;

/**
 * The viewer's marks for this show didn't load (the server's read timed out
 * or failed): the progress line says so with Try again, the toggles are off
 * with the reason, and the marking core refuses the show. Live: false again
 * as soon as a retry seeds the real state.
 */
export function useViewerUnavailable(seriesId: number): boolean {
  return useSeriesAnswer(seriesId, isUnavailable);
}

/**
 * The wall's controls (eye pills, the season line) are off: provided by the
 * viewer's wall, never by the static shell (which is inert anyway).
 */
export const ViewerLocked = createContext(false);

/**
 * Loads the viewer's marks for the show again and seeds them: the newer seed
 * replaces the unavailable one.
 */
export function useReloadViewer(
  seriesId: number,
): Readonly<{ pending: boolean; failed: boolean; retry: () => void }> {
  const store = useMarkingStoreApi();
  const [state, setState] = useState({ failed: false, pending: false });
  const retry = useCallback(() => {
    setState({ failed: false, pending: true });
    void ensureSeries(store, seriesId, { force: true }).then((loaded) =>
      setState({ failed: !loaded, pending: false }),
    );
  }, [seriesId, store]);
  return { ...state, retry };
}
