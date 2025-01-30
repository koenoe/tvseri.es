import { cache } from 'react';

import { getCacheItem, setCacheItem } from '@/lib/db/cache';
import { fetchTvSeriesCredits } from '@/lib/tmdb';
import { type Person } from '@/types/person';

import Avatars from '../Avatars/Avatars';

// Note: this won't work if we need more than 10 cast members
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
  const cast = await cachedCast(id);

  return cast.length > 0 ? (
    <Avatars className={className} items={cast.slice(0, 10)} />
  ) : (
    <div className={className} />
  );
}
