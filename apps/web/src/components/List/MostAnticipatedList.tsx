import { fetchMostAnticipatedTvSeries } from '@/lib/api';

import List, { type HeaderVariantProps } from './List';
import Poster from '../Tiles/Poster';

export default async function MostAnticipatedList(
  props: React.AllHTMLAttributes<HTMLDivElement> & HeaderVariantProps,
) {
  const items = await fetchMostAnticipatedTvSeries();

  return (
    <List
      title="Most anticipated"
      scrollRestoreKey="most-anticipated"
      {...props}
    >
      {items.map((item) => (
        <Poster key={item.id} item={item} />
      ))}
    </List>
  );
}
