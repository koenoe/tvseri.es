import { fetchTopRatedTvSeries } from '@/lib/api';
import Poster from '../Tiles/Poster';
import List, { type HeaderVariantProps } from './List';

export default async function TopRatedList({
  priority,
  ...rest
}: React.AllHTMLAttributes<HTMLDivElement> &
  HeaderVariantProps &
  Readonly<{ priority?: boolean }>) {
  const items = await fetchTopRatedTvSeries();

  return (
    <List
      scrollRestoreKey="all-time-favorites"
      title="All Time Favorites"
      {...rest}
    >
      {items.map((item) => (
        <Poster item={item} key={item.id} priority={priority} />
      ))}
    </List>
  );
}
