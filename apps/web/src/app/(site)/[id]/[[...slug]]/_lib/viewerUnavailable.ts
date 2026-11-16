'use client';

import { createContext, useCallback, useState } from 'react';
import { useSeriesAnswer } from '@/lib/marking/hooks';
import { useMarkingStoreApi } from '@/lib/marking/MarkingProvider';
import type { SeriesBase, SeriesSeed } from '@/lib/marking/types';

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

const inFlight = new Set<number>();

/**
 * Loads the viewer's marks for the show again (`GET /api/me/series/:id`, the
 * route the Remote uses on unseeded tiles) and seeds them: the newer seed
 * replaces the unavailable one. One request at a time per show.
 */
export function useReloadViewer(
  seriesId: number,
): Readonly<{ pending: boolean; failed: boolean; retry: () => void }> {
  const store = useMarkingStoreApi();
  const [state, setState] = useState({ failed: false, pending: false });
  const retry = useCallback(() => {
    if (inFlight.has(seriesId)) {
      return;
    }
    inFlight.add(seriesId);
    setState({ failed: false, pending: true });
    void fetch(`/api/me/series/${seriesId}`, { credentials: 'same-origin' })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`series ${response.status}`);
        }
        const seed = (await response.json()) as SeriesSeed;
        store.getState().seed(seed, JSON.stringify(seed));
        setState({ failed: false, pending: false });
      })
      .catch(() => setState({ failed: true, pending: false }))
      .finally(() => inFlight.delete(seriesId));
  }, [seriesId, store]);
  return { ...state, retry };
}
