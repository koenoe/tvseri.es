import 'server-only';

import type { TvSeries } from '@tvseri.es/schemas';
import { cacheLife } from 'next/cache';

import { apiFetch } from '@/lib/api/client';

/**
 * Public catalogue reads of the import, cached across requests so every chunk
 * of a large import doesn't ask the API (and TMDB) again for what an earlier
 * chunk resolved. Public data only: never user data.
 */

/**
 * `GET /search/series?q=`, keyed on the normalised title (the matcher passes
 * it that way).
 */
export async function searchSeries(
  title: string,
): Promise<ReadonlyArray<TvSeries>> {
  'use cache';
  cacheLife('medium');
  return apiFetch<TvSeries[]>('/search/series', { query: { q: title } });
}
