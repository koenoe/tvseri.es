import { getCacheItem, setCacheItem } from '@/lib/db/cache';
import { fetchMostAnticipatedTvSeries } from '@/lib/tmdb';
import { type TvSeries } from '@/types/tv-series';

import List, { type HeaderVariantProps } from './List';
import Poster from '../Tiles/Poster';

const cachedItems = async () => {
  const dynamoCacheKey = 'most-anticipated';
  const dynamoCachedItem = await getCacheItem<TvSeries[]>(dynamoCacheKey);
  if (dynamoCachedItem) {
    return dynamoCachedItem;
  }

  const items = await fetchMostAnticipatedTvSeries();

  await setCacheItem(dynamoCacheKey, items, {
    ttl: 604800, // 1 week
  });

  return items;
};

export default async function MostAnticipatedList(
  props: React.AllHTMLAttributes<HTMLDivElement> & HeaderVariantProps,
) {
  const items = await cachedItems();

  return (
    <List
      title="Most anticipated"
      scrollRestoreKey="most-anticipated"
      {...props}
    >
      {items.map((item) => (
        <Poster key={item.id} item={item} />
      ))}
    </List>
  );
}
