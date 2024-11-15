import { unstable_cacheLife } from 'next/cache';

import { CACHE_LIFE_ONE_DAY } from '@/constants';
import { fetchMostAnticipatedTvSeries } from '@/lib/tmdb';

import List, { type HeaderVariantProps } from './List';
import Poster from '../Tiles/Poster';

export default async function MostAnticipatedList(
  props: React.AllHTMLAttributes<HTMLDivElement> & HeaderVariantProps,
) {
  'use cache';

  unstable_cacheLife(CACHE_LIFE_ONE_DAY);

  const tvSeries = await fetchMostAnticipatedTvSeries();

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
