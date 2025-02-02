/**
 * Caches method results in DynamoDB for persistence.
 * Note: Only suitable for small result sets due to DynamoDB constraints.
 * Used because it's cost-effective for this use case.
 */
import { type Person } from '@/types/person';
import { type TvSeries, type Season } from '@/types/tv-series';

import { getCacheItem, setCacheItem } from './db/cache';
import { fetchPerson, fetchTvSeries, fetchTvSeriesSeason } from './tmdb';

export const cachedTvSeries = async (id: string | number) => {
  const dynamoCacheKey = `tv:v7:${id}`;
  const dynamoCachedItem = await getCacheItem<TvSeries>(dynamoCacheKey);
  if (dynamoCachedItem) {
    return dynamoCachedItem;
  }

  const tvSeries = await fetchTvSeries(id, {
    includeImages: true,
  });

  await setCacheItem(dynamoCacheKey, tvSeries, {
    ttl: 43200, // 12 hours
  });

  return tvSeries;
};

export const cachedTvSeriesSeason = async (
  id: number | string,
  season: number | string,
) => {
  const dynamoCacheKey = `tv:season:${id}_${season}`;
  const dynamoCachedItem = await getCacheItem<Season>(dynamoCacheKey);
  if (dynamoCachedItem) {
    return dynamoCachedItem;
  }

  const tvSeriesSeason = await fetchTvSeriesSeason(id, season);

  await setCacheItem(dynamoCacheKey, tvSeriesSeason, {
    ttl: 43200, // 12 hours
  });

  return tvSeriesSeason;
};

export const cachedPerson = async (id: string | number) => {
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
};
