import type { TvSeries } from '@tvseri.es/schemas';

import { statusLabel } from '@/lib/format/status';
import { type StartCard, seasonsLabel } from './startCards';

/** A deck card from a whole show (trending, circle picks) */
export function cardOfSeries(
  series: Pick<
    TvSeries,
    | 'id'
    | 'network'
    | 'numberOfSeasons'
    | 'posterImage'
    | 'slug'
    | 'status'
    | 'title'
  >,
  out = false,
): StartCard {
  return {
    id: series.id,
    poster: series.posterImage,
    provider: series.network?.logo
      ? { logo: series.network.logo, name: series.network.name }
      : null,
    seasons: seasonsLabel(series.numberOfSeasons, out),
    slug: series.slug,
    status: statusLabel(series.status, series.numberOfSeasons),
    title: series.title,
  };
}
