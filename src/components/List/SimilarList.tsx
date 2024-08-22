import { fetchTvSeriesSimilar } from '@/lib/tmdb';

import List, { type HeaderVariantProps } from './List';
import Poster from '../Tiles/Poster';

export default async function SimilarList({
  id,
  ...rest
}: Omit<React.AllHTMLAttributes<HTMLDivElement>, 'id'> &
  HeaderVariantProps &
  Readonly<{
    id: number | string;
  }>) {
  const tvSeries = await fetchTvSeriesSimilar(id);

  return tvSeries.length > 0 ? (
    <List title="Similar" scrollRestoreKey={`similar-${id}`} {...rest}>
      {tvSeries.map((item) => (
        <Poster key={item.id} item={item} />
      ))}
    </List>
  ) : null;
}
