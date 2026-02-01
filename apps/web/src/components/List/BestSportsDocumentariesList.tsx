import { cacheLife } from 'next/cache';

import { fetchBestSportsDocumentariesTvSeries } from '@/lib/api';
import Poster from '../Tiles/Poster';
import List, { type HeaderVariantProps } from './List';

async function cachedBestSportsDocumentariesTvSeries() {
  'use cache';
  cacheLife('long');
  return fetchBestSportsDocumentariesTvSeries();
}

export default async function BestSportsDocumentariesList(
  props: React.AllHTMLAttributes<HTMLDivElement> & HeaderVariantProps,
) {
  const items = await cachedBestSportsDocumentariesTvSeries();

  return (
    <List
      scrollRestoreKey="true-stories-in-sport"
      title="True Stories in Sport"
      {...props}
    >
      {items.map((item) => (
        <Poster item={item} key={item.id} />
      ))}
    </List>
  );
}
