import { fetchMostPopularTvSeriesThisMonth } from '@/lib/api';

import List, { type HeaderVariantProps } from './List';
import Poster from '../Tiles/Poster';

export default async function MostPopularThisMonthList({
  priority,
  ...rest
}: React.AllHTMLAttributes<HTMLDivElement> &
  HeaderVariantProps &
  Readonly<{ priority?: boolean }>) {
  try {
    const items = await fetchMostPopularTvSeriesThisMonth();

    return (
      <List
        title="Popular this month"
        scrollRestoreKey="most-popular-this-month"
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
