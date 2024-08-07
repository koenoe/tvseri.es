import { fetchTvSeriesSimilar } from '@/lib/tmdb';

import List, { type HeaderVariantProps } from './List';
import Poster from '../Tiles/Poster';

export default async function SimilarList({
  id,
  ...rest
}: Omit<React.AllHTMLAttributes<HTMLDivElement>, 'id'> &
  HeaderVariantProps &
  Readonly<{
    id: number;
  }>) {
  const tvSeries = await fetchTvSeriesSimilar(id);

  return tvSeries.length > 0 ? (
    <List title="Similar" {...rest}>
      {tvSeries.map((item) => (
        <Poster key={item.id} item={item} />
      ))}
    </List>
  ) : null;
}
