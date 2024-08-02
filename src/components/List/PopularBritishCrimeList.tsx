import { fetchPopularBritishCrimeTvSeries } from '@/lib/tmdb';
import List, { type HeaderVariantProps } from './List';
import Poster from '../Tiles/Poster';

export default async function PopularBritishCrimeList(
  props: React.AllHTMLAttributes<HTMLDivElement> & HeaderVariantProps,
) {
  const britishCrimeTvSeries = await fetchPopularBritishCrimeTvSeries();

  return (
    <List title="Popular British Crime" {...props}>
      {britishCrimeTvSeries.map((item) => (
        <Poster key={item.id} item={item} />
      ))}
    </List>
  );
}
