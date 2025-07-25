import { headers } from 'next/headers';
import auth from '@/auth';
import { fetchApplePlusTvSeries } from '@/lib/api';
import Poster from '../Tiles/Poster';
import List, { type HeaderVariantProps } from './List';

export default async function ApplePlusList(
  props: React.AllHTMLAttributes<HTMLDivElement> & HeaderVariantProps,
) {
  const [headerStore, { session }] = await Promise.all([headers(), auth()]);
  const region =
    session?.country || headerStore.get('cloudfront-viewer-country') || 'US';
  const tvSeries = await fetchApplePlusTvSeries(region);

  return (
    <List
      scrollRestoreKey="must-watch-on-apple-tv"
      title="Apple TV+ Essentials"
      {...props}
    >
      {tvSeries.map((item) => (
        <Poster item={item} key={item.id} />
      ))}
    </List>
  );
}
