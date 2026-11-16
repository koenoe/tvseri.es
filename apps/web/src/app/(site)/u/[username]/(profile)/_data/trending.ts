import 'server-only';

import type { TvSeries } from '@tvseri.es/schemas';

import { isUnavailable } from '@/lib/cache/unavailable';
import { loadTrendingShows } from '@/lib/series/trending';

/**
 * Popular this week, which a new owner's blocks borrow from (Up next's
 * picks, Start something new, Get started and the Library's Seen grid).
 * Null when the API fails (`Unavailable`; any other error is a bug and
 * throws): the blocks then leave it out until the API answers.
 */
export async function loadTrending(): Promise<ReadonlyArray<TvSeries> | null> {
  const shows = await loadTrendingShows();
  return isUnavailable(shows) ? null : shows;
}
