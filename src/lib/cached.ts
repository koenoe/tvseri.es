import 'server-only';

import { cache } from 'react';

import { type Person } from '@/types/person';
import { type TvSeries } from '@/types/tv-series';

import { getCacheItem, setCacheItem } from './db/cache';
import { fetchPerson, fetchTvSeries } from './tmdb';

export const cachedTvSeries = cache(async (id: string | number) => {
  const dynamoCacheKey = `tv:${id}`;
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
  const dynamoCacheKey = `person:${id}`;
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
