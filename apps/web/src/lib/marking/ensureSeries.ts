import type { MarkingStoreApi } from './store';
import type { SeriesSeed } from './types';

const pendingSeeds = new WeakMap<
  MarkingStoreApi,
  Map<number, Promise<boolean>>
>();

/**
 * Seeds a show the page didn't (cached tiles, the Remote on a tile): one
 * `GET /api/me/series/:id` per show at a time, shared by every caller in
 * the tab, so a hover warm-up and a Remote opening on the same show never
 * both fetch it. Resolves true once the store has the show, false when it
 * couldn't be read (signed out, a failed read). Callers check sign-in.
 */
export function ensureSeries(
  store: MarkingStoreApi,
  seriesId: number,
): Promise<boolean> {
  if (store.getState().series[seriesId]) {
    return Promise.resolve(true);
  }
  const pending =
    pendingSeeds.get(store) ?? new Map<number, Promise<boolean>>();
  pendingSeeds.set(store, pending);
  const existing = pending.get(seriesId);
  if (existing) {
    return existing;
  }
  const request = fetch(`/api/me/series/${seriesId}`, {
    credentials: 'same-origin',
  })
    .then(async (response) => {
      if (!response.ok) {
        return false;
      }
      const seed = (await response.json()) as SeriesSeed;
      store.getState().seed(seed, JSON.stringify(seed));
      return true;
    })
    .catch(() => false)
    .finally(() => pending.delete(seriesId));
  pending.set(seriesId, request);
  return request;
}
