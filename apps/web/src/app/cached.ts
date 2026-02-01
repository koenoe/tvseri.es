/**
 * Provides caching for methods used in React Server Components (RSCs).
 *
 * - `'use cache'` functions: Cross-request caching for PPR (static prerendering)
 * - `cache()` wrapper: Request-level deduplication (same request, multiple calls)
 */
import { cacheLife } from 'next/cache';
import { cache } from 'react';

import {
  fetchPerson,
  fetchTvSeries,
  fetchTvSeriesSeason,
  findUser,
} from '@/lib/api';

// TV Series: 'use cache' for PPR + cache() for request deduplication
async function fetchCachedTvSeries(...args: Parameters<typeof fetchTvSeries>) {
  'use cache';
  cacheLife('short');
  return fetchTvSeries(...args);
}
export const cachedTvSeries = cache(fetchCachedTvSeries);

// Person: 'use cache' for PPR + cache() for request deduplication
async function fetchCachedPerson(...args: Parameters<typeof fetchPerson>) {
  'use cache';
  cacheLife('medium');
  return fetchPerson(...args);
}
export const cachedPerson = cache(fetchCachedPerson);

// Request deduplication only (no PPR needed)
export const cachedTvSeriesSeason = cache(fetchTvSeriesSeason);
export const cachedUser = cache(findUser);
