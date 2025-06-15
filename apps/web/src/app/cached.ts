/**
 * Provides memoization/caching for methods used in React Server Components (RSCs).
 * Purpose: Prevents duplicate calls when the same method is invoked multiple times
 * during server-side rendering cycle.
 */
import { cache } from 'react';

import { fetchPerson, fetchTvSeries, fetchTvSeriesSeason } from '@/lib/api';
import { findUser } from '@/lib/db/user';
import { getAllWatched } from '@/lib/db/watched';
import { buildPosterImageUrl } from '@/lib/tmdb/helpers';

export const cachedTvSeries = cache(
  async (...args: Parameters<typeof fetchTvSeries>) => {
    const series = await fetchTvSeries(...args);
    return series;
  },
);

export const cachedTvSeriesSeason = cache(
  async (...args: Parameters<typeof fetchTvSeriesSeason>) => {
    const season = await fetchTvSeriesSeason(...args);
    return season;
  },
);

export const cachedPerson = cache(
  async (...args: Parameters<typeof fetchPerson>) => {
    const person = await fetchPerson(...args);
    return person;
  },
);

export const cachedUser = cache(findUser);

export const cachedWatchedByYear = cache(
  async (
    input: Readonly<{
      userId: string;
      year: number | string;
    }>,
  ) => {
    const items = await getAllWatched({
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
