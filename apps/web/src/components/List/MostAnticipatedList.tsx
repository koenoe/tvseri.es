import { cacheLife } from 'next/cache';

import { fetchMostAnticipatedTvSeries } from '@/lib/api';
import Poster from '../Tiles/Poster';
import List, { type HeaderVariantProps } from './List';

async function cachedMostAnticipatedTvSeries() {
  'use cache';
  cacheLife('short');
  return fetchMostAnticipatedTvSeries();
}

export default async function MostAnticipatedList(
  props: React.AllHTMLAttributes<HTMLDivElement> & HeaderVariantProps,
) {
  const items = await cachedMostAnticipatedTvSeries();

  return (
    <List
      scrollRestoreKey="most-anticipated"
      title="Most Anticipated"
      {...props}
    >
      {items.map((item) => (
        <Poster item={item} key={item.id} />
      ))}
    </List>
  );
}
