import { fetchApplePlusTvSeries } from '@/lib/api';
import Poster from '../Tiles/Poster';
import List, { type HeaderVariantProps } from './List';

export default async function ApplePlusList(
  props: React.AllHTMLAttributes<HTMLDivElement> & HeaderVariantProps,
) {
  const items = await fetchApplePlusTvSeries();

  return (
    <List
      scrollRestoreKey="must-watch-on-apple-tv"
      title="Apple TV+ Essentials"
      {...props}
    >
      {items.map((item) => (
        <Poster item={item} key={item.id} />
      ))}
    </List>
  );
}
