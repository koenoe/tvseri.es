import { type Movie } from '@/types/movie';
import { type TvSeries } from '@/types/tv-series';

export default function isMovie(item: Movie | TvSeries): item is Movie {
  return !('firstAirDate' in item);
}
