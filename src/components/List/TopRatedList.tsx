import { fetchTopRatedTvSeries } from '@/lib/tmdb';

import List, { type HeaderVariantProps } from './List';
import Poster from '../Tiles/Poster';

export default async function TopRatedList(
  props: React.AllHTMLAttributes<HTMLDivElement> &
    HeaderVariantProps &
    Readonly<{ priority?: boolean }>,
) {
  const tvSeries = await fetchTopRatedTvSeries();

  return (
    <List
      title="All time favorites"
      scrollRestoreKey="all-time-favorites"
      {...props}
    >
      {tvSeries.map((item) => (
        <Poster key={item.id} item={item} priority />
      ))}
    </List>
  );
}
