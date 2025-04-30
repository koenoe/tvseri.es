import { unstable_cacheLife } from 'next/cache';

import { fetchMostPopularTvSeriesThisMonth } from '@/lib/tmdb';

import List, { type HeaderVariantProps } from './List';
import Poster from '../Tiles/Poster';

export default async function MostPopularThisMonthList({
  priority,
  ...rest
}: React.AllHTMLAttributes<HTMLDivElement> &
  HeaderVariantProps &
  Readonly<{ priority?: boolean }>) {
  'use cache';

  unstable_cacheLife('weeks');

  try {
    const tvSeries = await fetchMostPopularTvSeriesThisMonth();

    return (
      <List
        title="Popular this month"
        scrollRestoreKey="most-popular-this-month"
        {...rest}
      >
        {tvSeries.map((item) => (
          <Poster key={item.id} item={item} priority={priority} />
        ))}
      </List>
    );
  } catch (error) {
    console.error(error);
    return null;
  }
}
