import { unstable_cacheLife } from 'next/cache';

import { fetchPopularBritishCrimeTvSeries } from '@/lib/tmdb';

import List, { type HeaderVariantProps } from './List';
import Poster from '../Tiles/Poster';

export default async function PopularBritishCrimeList(
  props: React.AllHTMLAttributes<HTMLDivElement> & HeaderVariantProps,
) {
  'use cache';
  unstable_cacheLife('weeks');

  const tvSeries = await fetchPopularBritishCrimeTvSeries();

  return (
    <List
      title="Popular British Crime"
      scrollRestoreKey="popular-british-crime"
      {...props}
    >
      {tvSeries.map((item) => (
        <Poster key={item.id} item={item} />
      ))}
    </List>
  );
}
