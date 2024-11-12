import { unstable_cache } from 'next/cache';

import { fetchPopularBritishCrimeTvSeries } from '@/lib/tmdb';

import List, { type HeaderVariantProps } from './List';
import Poster from '../Tiles/Poster';

const cachedPopularBritishCrimeTvSeries = unstable_cache(
  async () => {
    const items = await fetchPopularBritishCrimeTvSeries();
    return items;
  },
  ['popular-british-crime'],
  {
    revalidate: 604800, // 1 week
  },
);

export default async function PopularBritishCrimeList(
  props: React.AllHTMLAttributes<HTMLDivElement> & HeaderVariantProps,
) {
  const tvSeries = await cachedPopularBritishCrimeTvSeries();

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
