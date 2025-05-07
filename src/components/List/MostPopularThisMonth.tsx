import { getCacheItem, setCacheItem } from '@/lib/db/cache';
import { fetchMostPopularTvSeriesThisMonth } from '@/lib/tmdb';
import { type TvSeries } from '@/types/tv-series';

import List, { type HeaderVariantProps } from './List';
import Poster from '../Tiles/Poster';

const cachedItems = async () => {
  const dynamoCacheKey = 'most-popular-this-month';
  const dynamoCachedItem = await getCacheItem<TvSeries[]>(dynamoCacheKey);
  if (dynamoCachedItem) {
    return dynamoCachedItem;
  }

  const items = await fetchMostPopularTvSeriesThisMonth();

  await setCacheItem(dynamoCacheKey, items, {
    ttl: 604800, // 1 week
  });

  return items;
};

export default async function MostPopularThisMonthList({
  priority,
  ...rest
}: React.AllHTMLAttributes<HTMLDivElement> &
  HeaderVariantProps &
  Readonly<{ priority?: boolean }>) {
  try {
    const items = await cachedItems();

    return (
      <List
        title="Popular this month"
        scrollRestoreKey="most-popular-this-month"
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
