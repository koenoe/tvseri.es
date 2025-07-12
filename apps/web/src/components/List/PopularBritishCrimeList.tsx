import { fetchPopularBritishCrimeTvSeries } from '@/lib/api';
import Poster from '../Tiles/Poster';
import List, { type HeaderVariantProps } from './List';

export default async function PopularBritishCrimeList(
  props: React.AllHTMLAttributes<HTMLDivElement> & HeaderVariantProps,
) {
  const items = await fetchPopularBritishCrimeTvSeries();

  return (
    <List
      scrollRestoreKey="best-of-british-crime"
      title="Best of British Crime"
      {...props}
    >
      {items.map((item) => (
        <Poster item={item} key={item.id} />
      ))}
    </List>
  );
}
