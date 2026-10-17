import { cacheLife } from 'next/cache';

import { searchTvSeries } from '@/lib/api';

/**
 * Cross-request cache for import title lookups, so every chunk of a large
 * import doesn't search TMDB again for titles it already resolved. Keyed by
 * the normalised title; public catalogue data only.
 */
export async function cachedSearchTvSeries(title: string) {
  'use cache';
  cacheLife('medium');
  return searchTvSeries(title);
}
