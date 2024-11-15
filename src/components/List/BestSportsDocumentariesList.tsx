import { unstable_cacheLife } from 'next/cache';

import { fetchBestSportsDocumentariesTvSeries } from '@/lib/tmdb';

import List, { type HeaderVariantProps } from './List';
import Poster from '../Tiles/Poster';

export default async function BestSportsDocumentariesList(
  props: React.AllHTMLAttributes<HTMLDivElement> & HeaderVariantProps,
) {
  'use cache';

  unstable_cacheLife('weeks');

  const tvSeries = await fetchBestSportsDocumentariesTvSeries();

  return (
    <List
      title="Best sports documentaries"
      scrollRestoreKey="best-sports-documentaries"
      {...props}
    >
      {tvSeries.map((item) => (
        <Poster key={item.id} item={item} />
      ))}
    </List>
  );
}
