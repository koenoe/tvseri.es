/**
 * Caches method results in DynamoDB for persistence.
 * Note: Only suitable for small result sets due to DynamoDB constraints.
 * Used because it's cost-effective for this use case.
 */
import { type TvSeries, type Season } from '@/types/tv-series';

import { getCacheItem, setCacheItem } from './db/cache';
import { fetchTvSeries, fetchTvSeriesSeason } from './tmdb';

export const cachedTvSeries = async (id: string | number) => {
  const dynamoCacheKey = `tv:${id}`;
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
