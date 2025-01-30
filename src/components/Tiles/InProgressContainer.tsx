import { cachedTvSeries } from '@/app/cached';
import { type ListItem } from '@/lib/db/list';
import { getAllWatchedForTvSeries, type WatchedItem } from '@/lib/db/watched';
import { type TvSeries, type Season } from '@/types/tv-series';
import { type User } from '@/types/user';

import InProgress from './InProgress';

function getCurrentSeason(watchedItems: WatchedItem[], seasons: Season[]) {
  const watchCounts = watchedItems.reduce(
    (acc, item) => {
      acc[item.seasonNumber] = (acc[item.seasonNumber] || 0) + 1;
      return acc;
    },
    {} as Record<number, number>,
  );

  const sortedSeasons = [...seasons].sort(
    (a, b) => a.seasonNumber - b.seasonNumber,
  );

  const currentSeason = sortedSeasons.find((season) => {
    if (season.numberOfAiredEpisodes === 0) return false;
    const count = watchCounts[season.seasonNumber] || 0;
    return (
      count < (season.numberOfAiredEpisodes || season.numberOfEpisodes || 0)
    );
  });

  return {
    currentSeason,
    watchCount: currentSeason
      ? watchCounts[currentSeason.seasonNumber] || 0
      : 0,
  };
}

export default async function InProgressContainer({
  item,
  user,
}: Readonly<{
  item: ListItem;
  user: User;
}>) {
  const tvSeries = (await cachedTvSeries(item.id)) as TvSeries;
  const watchedItems = (await getAllWatchedForTvSeries({
    userId: user.id,
    tvSeries,
  })) as WatchedItem[];

  const { currentSeason, watchCount } = getCurrentSeason(
    watchedItems,
    tvSeries.seasons!,
  );

  return (
    <InProgress
      tvSeries={tvSeries}
      currentSeason={currentSeason!}
      totalWatchCount={watchedItems.length}
      currentSeasonWatchCount={watchCount}
    />
  );
}
