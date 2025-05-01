/**
 * Provides memoization/caching for methods used in React Server Components (RSCs).
 * Purpose: Prevents duplicate calls when the same method is invoked multiple times
 * during server-side rendering.
 */
import { cache } from 'react';

import {
  cachedPerson as _cachedPerson,
  cachedTvSeries as _cachedTvSeries,
  cachedTvSeriesSeason as _cachedTvSeriesSeason,
} from '@/lib/cached';
import { getAllWatchedByDate } from '@/lib/db/watched';
import { buildPosterImageUrl } from '@/lib/tmdb/helpers';

export const cachedTvSeries = cache(_cachedTvSeries);
export const cachedTvSeriesSeason = cache(_cachedTvSeriesSeason);
export const cachedPerson = cache(_cachedPerson);

export const cachedWatchedByYear = cache(
  async (
    input: Readonly<{
      userId: string;
      year: number | string;
    }>,
  ) => {
    const items = await getAllWatchedByDate({
      userId: input.userId,
      startDate: new Date(`${input.year}-01-01`),
      endDate: new Date(`${input.year}-12-31`),
    });
    return items;
  },
);

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
