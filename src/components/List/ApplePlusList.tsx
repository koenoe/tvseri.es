import { headers } from 'next/headers';

import { getCacheItem, setCacheItem } from '@/lib/db/cache';
import { fetchApplePlusTvSeries } from '@/lib/tmdb';
import { type TvSeries } from '@/types/tv-series';

import List, { type HeaderVariantProps } from './List';
import Poster from '../Tiles/Poster';

const cachedItems = async (region: string) => {
  const dynamoCacheKey = `must-watch-on-apple-tv:${region}`;
  const dynamoCachedItem = await getCacheItem<TvSeries[]>(dynamoCacheKey);
  if (dynamoCachedItem) {
    return dynamoCachedItem;
  }

  const items = await fetchApplePlusTvSeries(region);

  await setCacheItem(dynamoCacheKey, items, {
    ttl: 604800, // 1 week
  });

  return items;
};

export default async function ApplePlusList(
  props: React.AllHTMLAttributes<HTMLDivElement> & HeaderVariantProps,
) {
  const headerStore = await headers();
  const region = headerStore.get('cloudfront-viewer-country') || 'US';
  const tvSeries = await cachedItems(region);

  return (
    <List
      title="Must-watch on Apple TV+"
      scrollRestoreKey="must-watch-on-apple-tv"
      {...props}
    >
      {tvSeries.map((item) => (
        <Poster key={item.id} item={item} />
      ))}
    </List>
  );
}
