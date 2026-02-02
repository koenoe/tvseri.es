import auth from '@/auth';
import { fetchApplePlusTvSeries } from '@/lib/api';
import { getRegion } from '@/lib/geo';
import Poster from '../Tiles/Poster';
import List, { type HeaderVariantProps } from './List';

export default async function ApplePlusList(
  props: React.AllHTMLAttributes<HTMLDivElement> & HeaderVariantProps,
) {
  const [region, { user }] = await Promise.all([getRegion(), auth()]);
  const tvSeries = await fetchApplePlusTvSeries(user?.country || region);

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
