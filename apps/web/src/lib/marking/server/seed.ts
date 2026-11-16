import 'server-only';

import type { TvSeries } from '@tvseri.es/schemas';

import { toSeasonInfo } from '../seasonInfo';
import type { SeriesSeed } from '../types';
import { fetchProgress, fetchSeriesStatus } from './api';

type Show = Pick<TvSeries, 'seasons' | 'specials'>;

/**
 * The viewer's marking state for a show (`SeriesSeed`): its seasons, the
 * watched episodes and the list status + prefs. The one place a seed is
 * built: the show page's holes, the seed route (`/api/me/series/:id`) and
 * Mark next. The viewer's two reads start at once, beside the show's (pass
 * the read itself, or the show already in hand). `fetchedAt` is taken before
 * the reads, so a write that settles after it may be missing. Null for a
 * show the API doesn't know; a failed read throws.
 */
export async function readSeriesSeed(
  viewer: Readonly<{ accessToken: string; id: string }>,
  seriesId: number,
  show: Show | null | Promise<Show | null>,
): Promise<SeriesSeed | null> {
  const fetchedAt = Date.now();
  const [series, watched, status] = await Promise.all([
    show,
    fetchProgress(
      { accessToken: viewer.accessToken, userId: viewer.id },
      seriesId,
    ),
    fetchSeriesStatus(viewer.accessToken, seriesId),
  ]);
  return series
    ? { fetchedAt, seasons: toSeasonInfo(series), seriesId, status, watched }
    : null;
}
