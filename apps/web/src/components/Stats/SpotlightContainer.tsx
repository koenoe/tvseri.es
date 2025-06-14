import { cachedTvSeries } from '@/app/cached';
import { getWatched } from '@/lib/db/watched';
import { fetchTvSeriesEpisode } from '@/lib/tmdb';

import Spotlight from './Spotlight';

export default async function SpotlightContainer({
  userId,
  year,
  boundary,
}: Readonly<{
  userId: string;
  year: number;
  boundary: 'first' | 'last';
}>) {
  const { items } = await getWatched({
    userId,
    startDate: new Date(`${year}-01-01`),
    endDate: new Date(`${year}-12-31`),
    options: {
      limit: 1,
      sortDirection: boundary === 'first' ? 'asc' : 'desc',
    },
  });
  const watchedItem = items[0];

  if (!watchedItem) {
    return null;
  }

  const [tvSeries, episode] = await Promise.all([
    cachedTvSeries(watchedItem.seriesId),
    fetchTvSeriesEpisode(
      watchedItem.seriesId,
      watchedItem.seasonNumber,
      watchedItem.episodeNumber,
    ),
  ]);

  if (!tvSeries || !episode) {
    return null;
  }

  return <Spotlight item={watchedItem} tvSeries={tvSeries} episode={episode} />;
}
