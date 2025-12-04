/**
 * Provides memoization/caching for methods used in React Server Components (RSCs).
 * Purpose: Prevents duplicate calls when the same method is invoked multiple times
 * during server-side rendering cycle.
 */
import { cache } from 'react';
import {
  fetchPerson,
  fetchTvSeries,
  fetchTvSeriesSeason,
  findUser,
} from '@/lib/api';

export const cachedPerson = cache(fetchPerson);
export const cachedTvSeries = cache(fetchTvSeries);
export const cachedTvSeriesSeason = cache(fetchTvSeriesSeason);
export const cachedUser = cache(findUser);
