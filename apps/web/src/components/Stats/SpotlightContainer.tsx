import { cachedTvSeries } from '@/app/cached';
import { fetchTvSeriesEpisode, getWatched } from '@/lib/api';

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
    endDate: new Date(`${year}-12-31`),
    options: {
      limit: 1,
      sortDirection: boundary === 'first' ? 'asc' : 'desc',
    },
    startDate: new Date(`${year}-01-01`),
    userId,
  });
  const watchedItem = items[0];

  if (!watchedItem) {
    return null;
  }

  const [tvSeries, episode] = await Promise.all([
    cachedTvSeries(watchedItem.seriesId, { includeImages: true }),
    fetchTvSeriesEpisode(
      watchedItem.seriesId,
      watchedItem.seasonNumber,
      watchedItem.episodeNumber,
    ),
  ]);

  if (!tvSeries || !episode) {
    return null;
  }

  return <Spotlight episode={episode} item={watchedItem} tvSeries={tvSeries} />;
}
