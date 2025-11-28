import type { Movie, TvSeries } from '@tvseri.es/schemas';

export default function isTvSeries(item: Movie | TvSeries): item is TvSeries {
  return 'firstAirDate' in item;
}
