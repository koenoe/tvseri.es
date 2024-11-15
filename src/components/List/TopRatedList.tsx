import { unstable_cacheLife } from 'next/cache';

import { fetchTopRatedTvSeries } from '@/lib/tmdb';

import List, { type HeaderVariantProps } from './List';
import Poster from '../Tiles/Poster';

export default async function TopRatedList({
  priority,
  ...rest
}: React.AllHTMLAttributes<HTMLDivElement> &
  HeaderVariantProps &
  Readonly<{ priority?: boolean }>) {
  'use cache';

  unstable_cacheLife('weeks');

  const tvSeries = await fetchTopRatedTvSeries();

  return (
    <List
      title="All time favorites"
      scrollRestoreKey="all-time-favorites"
      {...rest}
    >
      {tvSeries.map((item) => (
        <Poster key={item.id} item={item} priority={priority} />
      ))}
    </List>
  );
}
