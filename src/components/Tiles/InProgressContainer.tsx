import { cachedTvSeries } from '@/app/cached';
import auth from '@/auth';
import { removeFromList, type ListItem } from '@/lib/db/list';
import { getAllWatchedForTvSeries, type WatchedItem } from '@/lib/db/watched';
import { type Season } from '@/types/tv-series';
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
  const [{ user: authenticatedUser }, tvSeries] = await Promise.all([
    auth(),
    cachedTvSeries(item.id),
  ]);

  const watchedItems = (await getAllWatchedForTvSeries({
    userId: user.id,
    tvSeries: tvSeries!,
  })) as WatchedItem[];

  const { currentSeason, watchCount } = getCurrentSeason(
    watchedItems,
    tvSeries!.seasons!,
  );

  const removeAction = async () => {
    'use server';

    if (authenticatedUser?.id !== user.id) {
      return;
    }

    try {
      await removeFromList({
        userId: user.id,
        listId: 'IN_PROGRESS',
        id: tvSeries!.id,
      });
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  return currentSeason ? (
    <InProgress
      tvSeries={tvSeries!}
      currentSeason={currentSeason}
      totalWatchCount={watchedItems.length}
      currentSeasonWatchCount={watchCount}
      removeAction={removeAction}
      removeIsAllowed={authenticatedUser?.id === user.id}
    />
  ) : null;
}
