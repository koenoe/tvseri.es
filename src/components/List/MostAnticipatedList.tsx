import { cache } from 'react';

import { unstable_cache } from 'next/cache';

import { fetchMostAnticipatedTvSeries } from '@/lib/tmdb';

import List, { type HeaderVariantProps } from './List';
import Poster from '../Tiles/Poster';

const cachedMostAnticipatedTvSeries = cache(async () =>
  unstable_cache(
    async () => {
      const items = await fetchMostAnticipatedTvSeries();
      return items;
    },
    ['most-anticipated'],
    {
      revalidate: 86400, // 1 day
    },
  )(),
);

export default async function MostAnticipatedList(
  props: React.AllHTMLAttributes<HTMLDivElement> & HeaderVariantProps,
) {
  const tvSeries = await cachedMostAnticipatedTvSeries();

  return (
    <List
      title="Most anticipated"
      scrollRestoreKey="most-anticipated"
      {...props}
    >
      {tvSeries.map((item) => (
        <Poster key={item.id} item={item} />
      ))}
    </List>
  );
}
