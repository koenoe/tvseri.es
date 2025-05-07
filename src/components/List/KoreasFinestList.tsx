import { getCacheItem, setCacheItem } from '@/lib/db/cache';
import { fetchKoreasFinestTvSeries } from '@/lib/tmdb';
import { type TvSeries } from '@/types/tv-series';

import List, { type HeaderVariantProps } from './List';
import Poster from '../Tiles/Poster';

const cachedItems = async () => {
  const dynamoCacheKey = 'koreas-finest';
  const dynamoCachedItem = await getCacheItem<TvSeries[]>(dynamoCacheKey);
  if (dynamoCachedItem) {
    return dynamoCachedItem;
  }

  const items = await fetchKoreasFinestTvSeries();

  await setCacheItem(dynamoCacheKey, items, {
    ttl: 2629800, // 1 month
  });

  return items;
};

export default async function KoreasFinestList(
  props: React.AllHTMLAttributes<HTMLDivElement> & HeaderVariantProps,
) {
  try {
    const items = await cachedItems();

    return (
      <List title="Korea's finest" scrollRestoreKey="koreas-finest" {...props}>
        {items.map((item) => (
          <Poster key={item.id} item={item} />
        ))}
      </List>
    );
  } catch (error) {
    console.error(error);
    return null;
  }
}
