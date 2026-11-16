import type { ArchiveStanding, TvSeries } from '@tvseri.es/schemas';

/** The buckets the archive line rounds a rank up to: "Top 5 all time" */
const TOP_BUCKETS = [5, 10, 20] as const;

const year = (series: Pick<TvSeries, 'firstAirDate'>) =>
  series.firstAirDate ? Number(series.firstAirDate.slice(0, 4)) : Number.NaN;

/**
 * Where an archive show stands in the all-time top rated list (best first):
 * its rank, the bucket it rounds up to, and whether it is the oldest show in
 * that bucket. Null when it is not in the list or below the last bucket.
 */
export const archiveStanding = (
  series: Pick<TvSeries, 'firstAirDate' | 'id'>,
  topRated: ReadonlyArray<Pick<TvSeries, 'firstAirDate' | 'id'>>,
): ArchiveStanding | null => {
  const rank = topRated.findIndex((item) => item.id === series.id) + 1;
  const top = TOP_BUCKETS.find((bucket) => rank > 0 && rank <= bucket);
  if (!top) {
    return null;
  }
  const own = year(series);
  const oldest = topRated
    .slice(0, top)
    .every((item) => item.id === series.id || !(year(item) < own));
  return { oldest: !Number.isNaN(own) && oldest, rank, top };
};
