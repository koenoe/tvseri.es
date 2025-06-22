import { fetchTopRatedTvSeries } from '@/lib/api';

import List, { type HeaderVariantProps } from './List';
import Poster from '../Tiles/Poster';

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
        title="All time favorites"
        scrollRestoreKey="all-time-favorites"
        {...rest}
      >
        {items.map((item) => (
          <Poster key={item.id} item={item} priority={priority} />
        ))}
      </List>
    );
  } catch (error) {
    console.error(error);
    return null;
  }
}
