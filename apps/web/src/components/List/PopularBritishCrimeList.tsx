import { fetchPopularBritishCrimeTvSeries } from '@/lib/api';
import Poster from '../Tiles/Poster';
import List, { type HeaderVariantProps } from './List';

export default async function PopularBritishCrimeList(
  props: React.AllHTMLAttributes<HTMLDivElement> & HeaderVariantProps,
) {
  const items = await fetchPopularBritishCrimeTvSeries();

  return (
    <List
      scrollRestoreKey="popular-british-crime"
      title="Popular British Crime"
      {...props}
    >
      {items.map((item) => (
        <Poster item={item} key={item.id} />
      ))}
    </List>
  );
}
