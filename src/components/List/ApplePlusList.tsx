import { cache } from 'react';

import { unstable_cache } from 'next/cache';
import { headers } from 'next/headers';

import { fetchApplePlusTvSeries } from '@/lib/tmdb';

import List, { type HeaderVariantProps } from './List';
import Poster from '../Tiles/Poster';

const cachedApplePlusTvSeries = cache(async (region: string) =>
  unstable_cache(
    async () => {
      const items = await fetchApplePlusTvSeries(region);
      return items;
    },
    ['apple-plus-tv-series'],
    {
      revalidate: 604800, // 1 week
    },
  )(),
);

export default async function ApplePlusList(
  props: React.AllHTMLAttributes<HTMLDivElement> & HeaderVariantProps,
) {
  const region = (await headers()).get('x-vercel-ip-country') || 'US';
  const tvSeries = await cachedApplePlusTvSeries(region);

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
