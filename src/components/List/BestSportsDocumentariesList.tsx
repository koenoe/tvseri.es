import { getCacheItem, setCacheItem } from '@/lib/db/cache';
import { fetchBestSportsDocumentariesTvSeries } from '@/lib/tmdb';
import { type TvSeries } from '@/types/tv-series';

import List, { type HeaderVariantProps } from './List';
import Poster from '../Tiles/Poster';

const cachedItems = async () => {
  const dynamoCacheKey = 'best-sports-documentaries';
  const dynamoCachedItem = await getCacheItem<TvSeries[]>(dynamoCacheKey);
  if (dynamoCachedItem) {
    return dynamoCachedItem;
  }

  const items = await fetchBestSportsDocumentariesTvSeries();

  await setCacheItem(dynamoCacheKey, items, {
    ttl: 2629800, // 1 month
  });

  return items;
};

export default async function BestSportsDocumentariesList(
  props: React.AllHTMLAttributes<HTMLDivElement> & HeaderVariantProps,
) {
  const items = await cachedItems();

  return (
    <List
      title="Best sports documentaries"
      scrollRestoreKey="best-sports-documentaries"
      {...props}
    >
      {items.map((item) => (
        <Poster key={item.id} item={item} />
      ))}
    </List>
  );
}
