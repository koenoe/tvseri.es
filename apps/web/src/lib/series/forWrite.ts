import 'server-only';

import type { TvSeries } from '@tvseri.es/schemas';

import { ApiError } from '@/lib/api/client';
import { isUnavailable } from '@/lib/cache/unavailable';

import { failedFillsOf, loadSeries, readSeries } from './loaders';

/**
 * The show for a write (marking, Mark next, the seed route, import): the
 * cached `loadSeries`, null on 404. One API read at most:
 *
 * - a cached outage (an earlier fill failed; kept for the `unavailable`
 *   life, 30 s) is not trusted for a write: the show is read once without
 *   the cache, and only a failure of that read fails the write (its
 *   `ApiError`, like any other API failure);
 * - when the entry was empty and the fill this call ran failed, the write
 *   fails at once (503) instead of asking again: in a throttle or a timeout
 *   a second read only doubles the wait and the load.
 */
export async function loadSeriesForWrite(id: number): Promise<TvSeries | null> {
  const failedBefore = failedFillsOf(id);
  const cached = await loadSeries(id);
  if (!isUnavailable(cached)) {
    return cached;
  }
  if (failedFillsOf(id) !== failedBefore) {
    throw new ApiError(503, 'SeriesUnavailable');
  }
  return readSeries(id);
}
