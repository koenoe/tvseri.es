import { fetchPopularBritishCrimeTvSeries } from '@/lib/tmdb';
import List from './List';

export default async function PopularBritishCrimeList(
  props: React.AllHTMLAttributes<HTMLDivElement>,
) {
  const britishCrimeTvSeries = await fetchPopularBritishCrimeTvSeries();

  return (
    <List
      items={britishCrimeTvSeries}
      title="Popular British Crime"
      {...props}
    />
  );
}
