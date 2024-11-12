import { unstable_cache } from 'next/cache';

import { fetchBestSportsDocumentariesTvSeries } from '@/lib/tmdb';

import List, { type HeaderVariantProps } from './List';
import Poster from '../Tiles/Poster';

const cachedBestSportsDocumentariesTvSeries = unstable_cache(
  async () => {
    const items = await fetchBestSportsDocumentariesTvSeries();
    return items;
  },
  ['best-sports-documentaries'],
  {
    revalidate: 604800, // 1 week
  },
);

export default async function BestSportsDocumentariesList(
  props: React.AllHTMLAttributes<HTMLDivElement> & HeaderVariantProps,
) {
  const tvSeries = await cachedBestSportsDocumentariesTvSeries();

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
