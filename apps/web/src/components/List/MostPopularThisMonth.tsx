import { fetchMostPopularTvSeriesThisMonth } from '@/lib/api';
import Poster from '../Tiles/Poster';
import List, { type HeaderVariantProps } from './List';

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
        scrollRestoreKey="most-popular-this-month"
        title="Popular this month"
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
