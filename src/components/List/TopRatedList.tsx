import { fetchTopRatedTvSeries } from '@/lib/tmdb';
import List, { type HeaderVariantProps } from './List';
import Poster from '../Tiles/Poster';

export default async function TopRatedList(
  props: React.AllHTMLAttributes<HTMLDivElement> &
    HeaderVariantProps &
    Readonly<{ priority?: boolean }>,
) {
  const topRatedTvSeries = await fetchTopRatedTvSeries();

  return (
    <List title="All time favourites" {...props}>
      {topRatedTvSeries.map((item) => (
        <Poster key={item.id} item={item} priority />
      ))}
    </List>
  );
}
