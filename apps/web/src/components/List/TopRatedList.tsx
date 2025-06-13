import { getCacheItem, setCacheItem } from '@/lib/db/cache';
import { fetchTopRatedTvSeries } from '@/lib/tmdb';
import { type TvSeries } from '@/types/tv-series';

import List, { type HeaderVariantProps } from './List';
import Poster from '../Tiles/Poster';

const cachedItems = async () => {
  const dynamoCacheKey = 'top-rated';
  const dynamoCachedItem = await getCacheItem<TvSeries[]>(dynamoCacheKey);
  if (dynamoCachedItem) {
    return dynamoCachedItem;
  }

  const items = await fetchTopRatedTvSeries();

  await setCacheItem(dynamoCacheKey, items, {
    ttl: 604800, // 1 week
  });

  return items;
};

export default async function TopRatedList({
  priority,
  ...rest
}: React.AllHTMLAttributes<HTMLDivElement> &
  HeaderVariantProps &
  Readonly<{ priority?: boolean }>) {
  try {
    const items = await cachedItems();

    return (
      <List
        title="All time favorites"
        scrollRestoreKey="all-time-favorites"
        {...rest}
      >
        {items.map((item) => (
          <Poster key={item.id} item={item} priority={priority} />
        ))}
      </List>
    );
  } catch (error) {
    console.error(error);
    return null;
  }
}
