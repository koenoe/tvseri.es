import List, { type HeaderVariantProps } from '@/components/List/List';
import { cachedWatchedByYear } from '@/lib/cached';
import { fetchPopularTvSeriesByYear } from '@/lib/tmdb';

import Poster from '../Tiles/Poster';

export default async function PopularNotWatched({
  priority,
  year,
  userId,
  ...rest
}: React.AllHTMLAttributes<HTMLDivElement> &
  HeaderVariantProps &
  Readonly<{ priority?: boolean; year: number | string; userId: string }>) {
  const tvSeries = await fetchPopularTvSeriesByYear(year);
  const items = await cachedWatchedByYear({ userId, year });
  const watchedSeriesIds = [...new Set(items.map((item) => item.seriesId))];
  const unwatchedSeries = tvSeries.filter(
    (series) => !watchedSeriesIds.includes(series.id),
  );

  return (
    <List
      title={<h2 className="text-md lg:text-lg">Popular unwatched</h2>}
      scrollRestoreKey="top-rated-shows-unwatched"
      scrollBarClassName="h-[3px] rounded-none"
      {...rest}
    >
      {unwatchedSeries.map((item) => (
        <Poster key={item.id} item={item} priority={priority} size="medium" />
      ))}
    </List>
  );
}
