import { cacheLife } from 'next/cache';

import { fetchMostPopularTvSeriesThisMonth } from '@/lib/api';
import Poster from '../Tiles/Poster';
import List, { type HeaderVariantProps } from './List';

async function cachedMostPopularTvSeriesThisMonth() {
  'use cache';
  cacheLife('medium');
  const items = await fetchMostPopularTvSeriesThisMonth();
  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  return { currentMonth, items };
}

export default async function MostPopularThisMonthList({
  priority,
  ...rest
}: React.AllHTMLAttributes<HTMLDivElement> &
  HeaderVariantProps &
  Readonly<{ priority?: boolean }>) {
  const { items, currentMonth } = await cachedMostPopularTvSeriesThisMonth();

  return (
    <List
      scrollRestoreKey="most-popular-this-month"
      title={`Top Picks for ${currentMonth}`}
      {...rest}
    >
      {items.map((item) => (
        <Poster item={item} key={item.id} priority={priority} />
      ))}
    </List>
  );
}
