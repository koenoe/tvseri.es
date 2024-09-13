import { type Movie } from '@/types/movie';
import { type TvSeries } from '@/types/tv-series';

export default function isTvSeries(item: Movie | TvSeries): item is TvSeries {
  return 'firstAirDate' in item;
}
