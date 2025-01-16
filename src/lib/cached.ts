/**
 * Caches method results in DynamoDB for persistence.
 * Note: Only suitable for small result sets due to DynamoDB constraints.
 * Used because it's cost-effective for this use case.
 */
import { type Person } from '@/types/person';
import { type TvSeries } from '@/types/tv-series';

import { getCacheItem, setCacheItem } from './db/cache';
import { fetchPerson, fetchTvSeries } from './tmdb';

export const cachedTvSeries = async (id: string | number) => {
  const dynamoCacheKey = `tv:v4:${id}`;
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
