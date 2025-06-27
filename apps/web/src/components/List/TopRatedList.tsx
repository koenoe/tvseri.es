import { fetchTopRatedTvSeries } from '@/lib/api';
import Poster from '../Tiles/Poster';
import List, { type HeaderVariantProps } from './List';

export default async function TopRatedList({
  priority,
  ...rest
}: React.AllHTMLAttributes<HTMLDivElement> &
  HeaderVariantProps &
  Readonly<{ priority?: boolean }>) {
  try {
    const items = await fetchTopRatedTvSeries();

    return (
      <List
        scrollRestoreKey="all-time-favorites"
        title="All time favorites"
        {...rest}
      >
        {items.map((item) => (
          <Poster item={item} key={item.id} priority={priority} />
        ))}
      </List>
    );
  } catch (error) {
    console.error(error);
    return null;
  }
}
