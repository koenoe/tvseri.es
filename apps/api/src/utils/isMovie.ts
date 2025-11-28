import type { Movie, TvSeries } from '@tvseri.es/schemas';

export default function isMovie(item: Movie | TvSeries): item is Movie {
  return !('firstAirDate' in item);
}
