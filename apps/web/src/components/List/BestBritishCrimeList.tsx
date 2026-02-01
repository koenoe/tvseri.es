import { cacheLife } from 'next/cache';

import { fetchBestBritishCrimeTvSeries } from '@/lib/api';
import Poster from '../Tiles/Poster';
import List, { type HeaderVariantProps } from './List';

async function cachedBestBritishCrimeTvSeries() {
  'use cache';
  cacheLife('long');
  return fetchBestBritishCrimeTvSeries();
}

export default async function BestBritishCrimeList(
  props: React.AllHTMLAttributes<HTMLDivElement> & HeaderVariantProps,
) {
  const items = await cachedBestBritishCrimeTvSeries();

  return (
    <List
      scrollRestoreKey="best-of-british-crime"
      title="Best of British Crime"
      {...props}
    >
      {items.map((item) => (
        <Poster item={item} key={item.id} />
      ))}
    </List>
  );
}
