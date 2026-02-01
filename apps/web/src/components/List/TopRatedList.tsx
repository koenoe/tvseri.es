import { cacheLife } from 'next/cache';

import { fetchTopRatedTvSeries } from '@/lib/api';
import Poster from '../Tiles/Poster';
import List, { type HeaderVariantProps } from './List';

async function cachedTopRatedTvSeries() {
  'use cache';
  cacheLife('long');
  return fetchTopRatedTvSeries();
}

export default async function TopRatedList({
  priority,
  ...rest
}: React.AllHTMLAttributes<HTMLDivElement> &
  HeaderVariantProps &
  Readonly<{ priority?: boolean }>) {
  const items = await cachedTopRatedTvSeries();

  return (
    <List
      scrollRestoreKey="all-time-favorites"
      title="All Time Favorites"
      {...rest}
    >
      {items.map((item) => (
        <Poster item={item} key={item.id} priority={priority} />
      ))}
    </List>
  );
}
