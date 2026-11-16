import type { TvSeries } from '@tvseri.es/schemas';
import { formatSeriesYears } from '@tvseri.es/utils';

import { plural } from '@/lib/format/text';

/** "3 seasons", "1 season" */
export const seasonsLabel = (count: number) => plural(count, 'season');

/** A show's seasons for a facts line, or '' when it has none yet (a `MetaItem` with '' draws nothing) */
export const showSeasons = (series: Pick<TvSeries, 'numberOfSeasons'>) =>
  series.numberOfSeasons > 0 ? seasonsLabel(series.numberOfSeasons) : '';

/**
 * A show's years for a facts line, in the shared format ("2002–2008",
 * "2014–" while it runs), else the year it started
 */
export const showYears = (
  series: Pick<
    TvSeries,
    'firstAirDate' | 'lastAirDate' | 'releaseYear' | 'status'
  >,
) => formatSeriesYears(series) || series.releaseYear;
