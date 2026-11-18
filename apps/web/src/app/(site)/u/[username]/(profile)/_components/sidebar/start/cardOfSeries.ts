import type { TvSeries } from '@tvseri.es/schemas';

import { seriesSeasons, statusLabel } from '@/lib/format/status';
import { type StartCard, seasonsLabel } from './startCards';

/** A deck card from a whole show (trending, circle picks) */
export function cardOfSeries(
  series: Pick<
    TvSeries,
    | 'id'
    | 'network'
    | 'numberOfSeasons'
    | 'posterImage'
    | 'seasons'
    | 'slug'
    | 'status'
    | 'title'
  >,
  out = false,
): StartCard {
  const { airedSeasons, renewedSeason } = seriesSeasons(series);
  return {
    id: series.id,
    poster: series.posterImage,
    provider: series.network?.logo
      ? { logo: series.network.logo, name: series.network.name }
      : null,
    seasons: seasonsLabel(airedSeasons, out),
    slug: series.slug,
    status: statusLabel({ renewedSeason, status: series.status }),
    title: series.title,
  };
}
