/**
 * Provides memoization/caching for methods used in React Server Components (RSCs).
 * Purpose: Prevents duplicate calls when the same method is invoked multiple times
 * during server-side rendering cycle.
 */

import { cacheLife } from 'next/cache';
import { cache } from 'react';
import {
  fetchPerson,
  fetchTvSeries,
  fetchTvSeriesSeason,
  findUser,
} from '@/lib/api';

async function fetchCachedTvSeries(...args: Parameters<typeof fetchTvSeries>) {
  'use cache';
  cacheLife('short');
  return fetchTvSeries(...args);
}

async function fetchCachedTvSeriesSeason(
  ...args: Parameters<typeof fetchTvSeriesSeason>
) {
  'use cache';
  cacheLife('short');
  return fetchTvSeriesSeason(...args);
}

async function fetchCachedPerson(...args: Parameters<typeof fetchPerson>) {
  'use cache';
  cacheLife('medium');
  return fetchPerson(...args);
}

export const cachedPerson = cache(fetchCachedPerson);
export const cachedTvSeries = cache(fetchCachedTvSeries);
export const cachedTvSeriesSeason = cache(fetchCachedTvSeriesSeason);
export const cachedUser = cache(findUser);
