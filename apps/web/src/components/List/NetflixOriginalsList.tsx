import { headers } from 'next/headers';
import auth from '@/auth';
import { fetchNetflixOriginals } from '@/lib/api';
import Poster from '../Tiles/Poster';
import List, { type HeaderVariantProps } from './List';

export default async function NetflixOriginalsList(
  props: React.AllHTMLAttributes<HTMLDivElement> & HeaderVariantProps,
) {
  const [headerStore, { user }] = await Promise.all([headers(), auth()]);
  const region =
    user?.country || headerStore.get('cloudfront-viewer-country') || 'US';
  const tvSeries = await fetchNetflixOriginals(region);

  return (
    <List
      scrollRestoreKey="netflix-originals"
      title="Unmissable on Netflix"
      {...props}
    >
      {tvSeries.map((item) => (
        <Poster item={item} key={item.id} />
      ))}
    </List>
  );
}
