import { cache } from 'react';

import { unstable_cache } from 'next/cache';

import { fetchTopRatedTvSeries } from '@/lib/tmdb';

import List, { type HeaderVariantProps } from './List';
import Poster from '../Tiles/Poster';

const cachedTopRatedTvSeries = cache(async () =>
  unstable_cache(
    async () => {
      const items = await fetchTopRatedTvSeries();
      return items;
    },
    ['top-rated'],
    {
      revalidate: 604800, // 1 week
    },
  )(),
);

export default async function TopRatedList({
  priority,
  ...rest
}: React.AllHTMLAttributes<HTMLDivElement> &
  HeaderVariantProps &
  Readonly<{ priority?: boolean }>) {
  const tvSeries = await cachedTopRatedTvSeries();

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
