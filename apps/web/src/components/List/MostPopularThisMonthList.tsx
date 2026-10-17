import { fetchMostPopularTvSeriesThisMonth } from '@/lib/api';
import Poster from '../Tiles/Poster';
import List, { type HeaderVariantProps } from './List';

export default async function MostPopularThisMonthList({
  priority,
  ...rest
}: React.AllHTMLAttributes<HTMLDivElement> &
  HeaderVariantProps &
  Readonly<{ priority?: boolean }>) {
  const { items, month } = await fetchMostPopularTvSeriesThisMonth();

  const title = `Top Picks for ${month}`;

  return (
    <List scrollRestoreKey="most-popular-this-month" title={title} {...rest}>
      {items.map((item) => (
        <Poster item={item} key={item.id} priority={priority} />
      ))}
    </List>
  );
}
