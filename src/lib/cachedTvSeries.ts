import 'server-only';

import { cache } from 'react';

import { type TvSeries } from '@/types/tv-series';

import { getCacheItem, setCacheItem } from './db/cache';
import { fetchTvSeries } from './tmdb';

const cachedTvSeries = cache(async (id: string | number) => {
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

export default cachedTvSeries;
