import List, { type HeaderVariantProps } from '@/components/List/List';
import { fetchPopularTvSeriesByYear, getStatsWatchedSeries } from '@/lib/api';

import Poster from '../Tiles/Poster';

export default async function PopularNotWatched({
  priority,
  year,
  userId,
  ...rest
}: React.AllHTMLAttributes<HTMLDivElement> &
  HeaderVariantProps &
  Readonly<{ priority?: boolean; year: number | string; userId: string }>) {
  const [tvSeries, watchedSeries] = await Promise.all([
    fetchPopularTvSeriesByYear(year),
    getStatsWatchedSeries({ userId, year }),
  ]);
  const watchedSeriesIds = new Set(watchedSeries.map((item) => item.id));
  const unwatchedSeries = tvSeries.filter(
    (series) => !watchedSeriesIds.has(series.id),
  );

  if (unwatchedSeries.length === 0) {
    return null;
  }

  return (
    <List
      scrollBarClassName="h-[3px] rounded-none"
      scrollRestoreKey="top-rated-shows-unwatched"
      title={<h2 className="text-md lg:text-lg">Popular unwatched</h2>}
      {...rest}
    >
      {unwatchedSeries.map((item) => (
        <Poster item={item} key={item.id} priority={priority} size="medium" />
      ))}
    </List>
  );
}
