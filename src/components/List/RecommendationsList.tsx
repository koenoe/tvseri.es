import { unstable_cacheLife } from 'next/cache';

import { CACHE_LIFE_ONE_DAY } from '@/constants';
import { fetchTvSeriesRecommendations } from '@/lib/tmdb';

import List, { type HeaderVariantProps } from './List';
import Poster from '../Tiles/Poster';

export default async function RecommendationsList({
  id,
  ...rest
}: Omit<React.AllHTMLAttributes<HTMLDivElement>, 'id'> &
  HeaderVariantProps &
  Readonly<{
    id: number | string;
  }>) {
  'use cache';

  unstable_cacheLife(CACHE_LIFE_ONE_DAY);

  const tvSeries = await fetchTvSeriesRecommendations(id);

  return tvSeries.length > 0 ? (
    <List
      title="Recommendations"
      scrollRestoreKey={`recommendations-${id}`}
      {...rest}
    >
      {tvSeries.map((item) => (
        <Poster key={item.id} item={item} />
      ))}
    </List>
  ) : null;
}
