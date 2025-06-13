import { cachedTvSeries } from '@/app/cached';
import auth from '@/auth';
import { removeFromList, type ListItem } from '@/lib/db/list';
import { getAllWatchedForTvSeries, type WatchedItem } from '@/lib/db/watched';
import { type Season } from '@/types/tv-series';
import { type User } from '@/types/user';

import InProgress from './InProgress';

function getCurrentSeason(watchedItems: WatchedItem[], seasons: Season[]) {
  if (watchedItems.length === 0 || seasons.length === 0) {
    return { currentSeason: undefined, watchCount: 0 };
  }

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

  const lastWatched = [...watchedItems].sort(
    (a, b) => b.watchedAt - a.watchedAt,
  )[0];

  const lastWatchedSeason = sortedSeasons.find(
    (season) => season.seasonNumber === lastWatched?.seasonNumber,
  );

  if (lastWatchedSeason) {
    const watchCount = watchCounts[lastWatchedSeason.seasonNumber] || 0;
    const isSeasonFinished =
      watchCount >=
      (lastWatchedSeason.numberOfAiredEpisodes ||
        lastWatchedSeason.numberOfEpisodes ||
        0);

    if (!isSeasonFinished) {
      return {
        currentSeason: lastWatchedSeason,
        watchCount,
      };
    }

    const nextSeasonIndex =
      sortedSeasons.findIndex(
        (season) => season.seasonNumber === lastWatchedSeason.seasonNumber,
      ) + 1;

    if (nextSeasonIndex < sortedSeasons.length) {
      const nextSeason = sortedSeasons[nextSeasonIndex];

      if (nextSeason?.numberOfAiredEpisodes) {
        return {
          currentSeason: nextSeason,
          watchCount: watchCounts[nextSeason.seasonNumber] || 0,
        };
      }
    }
  }

  const firstUnfinishedSeason = sortedSeasons.find((season) => {
    if (season.numberOfAiredEpisodes === 0) {
      return false;
    }
    const count = watchCounts[season.seasonNumber] || 0;
    return (
      count < (season.numberOfAiredEpisodes || season.numberOfEpisodes || 0)
    );
  });

  return {
    currentSeason: firstUnfinishedSeason,
    watchCount: firstUnfinishedSeason
      ? watchCounts[firstUnfinishedSeason.seasonNumber] || 0
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
      currentSeasonWatchCount={watchCount}
      removeAction={removeAction}
      removeIsAllowed={authenticatedUser?.id === user.id}
    />
  ) : null;
}
