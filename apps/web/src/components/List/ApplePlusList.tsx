import { headers } from 'next/headers';

import { fetchApplePlusTvSeries } from '@/lib/api';

import List, { type HeaderVariantProps } from './List';
import Poster from '../Tiles/Poster';

export default async function ApplePlusList(
  props: React.AllHTMLAttributes<HTMLDivElement> & HeaderVariantProps,
) {
  const headerStore = await headers();
  const region = headerStore.get('cloudfront-viewer-country') || 'US';
  const tvSeries = await fetchApplePlusTvSeries(region);

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
