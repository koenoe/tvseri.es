import type { Movie, TvSeries } from '@tvseri.es/types';

export default function isTvSeries(item: Movie | TvSeries): item is TvSeries {
  return 'firstAirDate' in item;
}
