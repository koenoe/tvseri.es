'use client';

import type { SeriesRuntimes } from '@tvseri.es/schemas';

import useCachedJson from './useCachedJson';

/**
 * A show's episode runtimes for every regular season, from one request
 * (`GET /api/series/:id/runtimes`, CDN-cached), loaded once per tab when a
 * part that needs them is shown (the season panel, the history sheet):
 * `undefined` while loading or disabled, `null` when it failed.
 */
export default function useRuntimes(seriesId: number, enabled = true) {
  return useCachedJson<SeriesRuntimes>(
    enabled ? `/api/series/${seriesId}/runtimes` : null,
  );
}
