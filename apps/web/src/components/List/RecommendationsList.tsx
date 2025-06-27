import { fetchTvSeriesRecommendations } from '@/lib/api';
import Poster from '../Tiles/Poster';
import List, { type HeaderVariantProps } from './List';

export default async function RecommendationsList({
  id,
  ...rest
}: Omit<React.AllHTMLAttributes<HTMLDivElement>, 'id'> &
  HeaderVariantProps &
  Readonly<{
    id: number | string;
  }>) {
  const tvSeries = await fetchTvSeriesRecommendations(id);

  return tvSeries.length > 0 ? (
    <List
      scrollRestoreKey={`recommendations-${id}`}
      title="Recommendations"
      {...rest}
    >
      {tvSeries.map((item) => (
        <Poster item={item} key={item.id} />
      ))}
    </List>
  ) : null;
}
