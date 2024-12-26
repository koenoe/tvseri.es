import 'server-only';

import { cache } from 'react';

import { type Person } from '@/types/person';
import { type TvSeries } from '@/types/tv-series';

import { getCacheItem, setCacheItem } from './db/cache';
import { getAllListItems } from './db/list';
import { getAllWatchedByDate } from './db/watched';
import { fetchPerson, fetchTvSeries } from './tmdb';

export const cachedTvSeries = cache(async (id: string | number) => {
  const dynamoCacheKey = `tv:v2:${id}`;
  const dynamoCachedItem = await getCacheItem<TvSeries>(dynamoCacheKey);
  if (dynamoCachedItem) {
    return dynamoCachedItem;
  }

  const tvSeries = await fetchTvSeries(id, {
    includeImages: true,
  });

  await setCacheItem(dynamoCacheKey, tvSeries, {
    ttl: 86400, // 1 day
  });

  return tvSeries;
});

export const cachedPerson = cache(async (id: string | number) => {
  const dynamoCacheKey = `person:v1:${id}`;
  const dynamoCachedItem = await getCacheItem<Person>(dynamoCacheKey);
  if (dynamoCachedItem) {
    return dynamoCachedItem;
  }

  const tvSeries = await fetchPerson(id);

  await setCacheItem(dynamoCacheKey, tvSeries, {
    ttl: 86400, // 1 day
  });

  return tvSeries;
});

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

export const cachedWatchedByYearFromList = cache(
  async (
    input: Readonly<{
      userId: string;
      year: number | string;
    }>,
  ) => {
    const items = await getAllListItems({
      listId: 'WATCHED',
      userId: input.userId,
      startDate: new Date(`${input.year}-01-01`),
      endDate: new Date(`${input.year}-12-31`),
    });
    return items;
  },
);
