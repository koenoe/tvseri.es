import { fetchMostPopularTvSeriesThisMonth } from '@/lib/api';
import Poster from '../Tiles/Poster';
import List, { type HeaderVariantProps } from './List';

export default async function MostPopularThisMonthList({
  priority,
  ...rest
}: React.AllHTMLAttributes<HTMLDivElement> &
  HeaderVariantProps &
  Readonly<{ priority?: boolean }>) {
  const items = await fetchMostPopularTvSeriesThisMonth();
  const currentMonth = new Date().toLocaleString('default', { month: 'long' });

  return (
    <List
      scrollRestoreKey="most-popular-this-month"
      title={`Top Picks for ${currentMonth}`}
      {...rest}
    >
      {items.map((item) => (
        <Poster item={item} key={item.id} priority={priority} />
      ))}
    </List>
  );
}
