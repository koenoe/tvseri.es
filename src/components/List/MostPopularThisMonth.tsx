import { unstable_cache } from 'next/cache';

import { fetchMostPopularTvSeriesThisMonth } from '@/lib/tmdb';

import List, { type HeaderVariantProps } from './List';
import Poster from '../Tiles/Poster';

const cachedMostPopularThisMonth = unstable_cache(
  async () => {
    const items = await fetchMostPopularTvSeriesThisMonth();
    return items;
  },
  ['most-popular-this-month'],
  {
    revalidate: 259200, // 3 days
  },
);

export default async function MostPopularThisMonthList({
  priority,
  ...rest
}: React.AllHTMLAttributes<HTMLDivElement> &
  HeaderVariantProps &
  Readonly<{ priority?: boolean }>) {
  const tvSeries = await cachedMostPopularThisMonth();

  return (
    <List
      title="Popular right now"
      scrollRestoreKey="most-popular-this-month"
      {...rest}
    >
      {tvSeries.map((item) => (
        <Poster key={item.id} item={item} priority={priority} />
      ))}
    </List>
  );
}
