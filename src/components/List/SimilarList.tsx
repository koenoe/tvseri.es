import { unstable_cacheLife } from 'next/cache';

import { CACHE_LIFE_ONE_DAY } from '@/constants';
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
  'use cache';

  unstable_cacheLife(CACHE_LIFE_ONE_DAY);

  const tvSeries = await fetchTvSeriesSimilar(id);

  return tvSeries.length > 0 ? (
    <List title="Similar" scrollRestoreKey={`similar-${id}`} {...rest}>
      {tvSeries.map((item) => (
        <Poster key={item.id} item={item} />
      ))}
    </List>
  ) : null;
}
