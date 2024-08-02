import { fetchTopRatedTvSeries } from '@/lib/tmdb';
import List from './List';

export default async function TopRatedList(
  props: React.AllHTMLAttributes<HTMLDivElement> &
    Readonly<{ priority?: boolean }>,
) {
  const topRatedTvSeries = await fetchTopRatedTvSeries();

  return (
    <List items={topRatedTvSeries} title="All time favourites" {...props} />
  );
}
