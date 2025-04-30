import { unstable_cacheLife } from 'next/cache';
import { headers } from 'next/headers';

import { fetchApplePlusTvSeries } from '@/lib/tmdb';

import List, { type HeaderVariantProps } from './List';
import Poster from '../Tiles/Poster';

const cachedApplePlusTvSeries = async (region: string) => {
  'use cache';

  unstable_cacheLife('weeks');

  const items = await fetchApplePlusTvSeries(region);
  return items;
};

export default async function ApplePlusList(
  props: React.AllHTMLAttributes<HTMLDivElement> & HeaderVariantProps,
) {
  const headerStore = await headers();
  const region = headerStore.get('cloudfront-viewer-country') || 'US';
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
