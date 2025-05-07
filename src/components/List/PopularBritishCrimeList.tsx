import { getCacheItem, setCacheItem } from '@/lib/db/cache';
import { fetchPopularBritishCrimeTvSeries } from '@/lib/tmdb';
import { type TvSeries } from '@/types/tv-series';

import List, { type HeaderVariantProps } from './List';
import Poster from '../Tiles/Poster';

const cachedItems = async () => {
  const dynamoCacheKey = 'popular-british-crime';
  const dynamoCachedItem = await getCacheItem<TvSeries[]>(dynamoCacheKey);
  if (dynamoCachedItem) {
    return dynamoCachedItem;
  }

  const items = await fetchPopularBritishCrimeTvSeries();

  await setCacheItem(dynamoCacheKey, items, {
    ttl: 2629800, // 1 month
  });

  return items;
};

export default async function PopularBritishCrimeList(
  props: React.AllHTMLAttributes<HTMLDivElement> & HeaderVariantProps,
) {
  const items = await cachedItems();

  return (
    <List
      title="Popular British Crime"
      scrollRestoreKey="popular-british-crime"
      {...props}
    >
      {items.map((item) => (
        <Poster key={item.id} item={item} />
      ))}
    </List>
  );
}
