/**
 * Provides memoization/caching for methods used in React Server Components (RSCs).
 * Purpose: Prevents duplicate calls when the same method is invoked multiple times
 * during server-side rendering.
 */
import { cache } from 'react';

import { unstable_cacheLife as cacheLife } from 'next/cache';

import { getAllWatchedByDate } from '@/lib/db/watched';
import { fetchPerson, fetchTvSeries, fetchTvSeriesSeason } from '@/lib/tmdb';
import { buildPosterImageUrl } from '@/lib/tmdb/helpers';

export const cachedPerson = async (id: string | number) => {
  'use cache';
  cacheLife('days');

  const person = await fetchPerson(id);
  return person;
};

export const cachedTvSeries = async (id: string | number) => {
  'use cache';
  cacheLife('days');

  const tvSeries = await fetchTvSeries(id, {
    includeImages: true,
  });

  return tvSeries;
};

export const cachedTvSeriesSeason = async (
  id: number | string,
  season: number | string,
) => {
  'use cache';
  cacheLife('days');

  const result = await fetchTvSeriesSeason(id, season);
  return result;
};

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
