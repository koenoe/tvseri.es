import type { TvSeries } from '@tvseri.es/schemas';

import type { NotFoundShow } from '@/components/ui/error/notFoundShow';
import { isUnavailable } from '@/lib/cache/unavailable';
import { loadTrendingShows } from '@/lib/series/trending';

/** Trims the API's shows to what the 404 draws (posters + Pick one). */
export function toNotFoundShows(
  series: ReadonlyArray<TvSeries>,
): NotFoundShow[] {
  return series
    .filter((show) => show.posterImage)
    .map(({ id, posterImage, slug, title }) => ({
      id,
      poster: posterImage,
      slug,
      title,
    }));
}

/**
 * The trending shows for the 404's posters and Pick one for me, from the
 * shared cached read, so the 404 stays prerendered. Empty when the API is
 * down or not configured (a local build): the 404 then leaves both out.
 */
export async function loadTrending(): Promise<NotFoundShow[]> {
  const shows = await loadTrendingShows();
  return isUnavailable(shows) ? [] : toNotFoundShows(shows);
}
