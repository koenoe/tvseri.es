import { fetchMostAnticipatedTvSeries } from '@/lib/tmdb';

import List, { type HeaderVariantProps } from './List';
import Poster from '../Tiles/Poster';

export default async function MostAnticipatedList(
  props: React.AllHTMLAttributes<HTMLDivElement> & HeaderVariantProps,
) {
  const tvSeries = await fetchMostAnticipatedTvSeries();

  return (
    <List
      title="Most anticipated"
      scrollRestoreKey="most-anticipated"
      {...props}
    >
      {tvSeries.map((item) => (
        <Poster key={item.id} item={item} />
      ))}
    </List>
  );
}
