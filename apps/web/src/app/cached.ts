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
  getWatchedByYear,
} from '@/lib/api';
import { buildPosterImageUrl } from '@/lib/tmdb/helpers';

export const cachedPerson = cache(fetchPerson);
export const cachedTvSeries = cache(fetchTvSeries);
export const cachedTvSeriesSeason = cache(fetchTvSeriesSeason);
export const cachedUser = cache(findUser);
export const cachedWatchedByYear = cache(getWatchedByYear);

export const cachedUniqueWatchedByYear = cache(
  async (
    input: Readonly<{
      userId: string;
      year: number | string;
    }>,
  ) => {
    const items = await cachedWatchedByYear(input);
    const uniqueItems = [
      ...new Map(items.map((item) => [item.seriesId, item])).values(),
    ];
    return uniqueItems.map((item) => ({
      id: item.seriesId,
      posterImage: (item.posterPath
        ? buildPosterImageUrl(item.posterPath)
        : item.posterImage) as string,
      posterPath: item.posterPath,
      title: item.title,
      slug: item.slug,
    }));
  },
);
