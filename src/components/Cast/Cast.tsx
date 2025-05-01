import { cache } from 'react';

import { getCacheItem, setCacheItem } from '@/lib/db/cache';
import { fetchTvSeriesCredits } from '@/lib/tmdb';
import { type Person } from '@/types/person';

import Avatars from '../Avatars/Avatars';

const cachedCast = cache(async (id: number) => {
  const dynamoCacheKey = `cast:${id}`;
  const dynamoCachedItem = await getCacheItem<Person[]>(dynamoCacheKey);
  if (dynamoCachedItem) {
    return dynamoCachedItem;
  }

  const { cast } = await fetchTvSeriesCredits(id);
  const items = cast.slice(0, 10);

  await setCacheItem(dynamoCacheKey, items, {
    ttl: 43200, // 12 hours
  });

  return items;
});

export default async function Cast({
  className,
  id,
}: {
  className?: string;
  id: number;
}) {
  const items = await cachedCast(id);

  return items.length > 0 ? (
    <Avatars className={className} items={items.slice(0, 10)} />
  ) : (
    <div className={className} />
  );
}
