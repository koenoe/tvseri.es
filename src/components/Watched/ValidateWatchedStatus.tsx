import auth from '@/lib/auth';
import { cachedTvSeries } from '@/lib/cached';
import {
  addToList,
  isInList,
  removeFromList,
  removeFromWatchlist,
} from '@/lib/db/list';
import { getWatchedCountForTvSeries } from '@/lib/db/watched';

// Note: The DynamoDB subscriber (`src/lambdas/watched.ts`) handles marking a TV series as watched or in progress.
// However, a series marked as watched may later have new episodes added.
// In such cases, the series should be moved from the "watched" list to the "in progress" list.
// Automating this process in the future with a cron job or similar mechanism could be beneficial.
// For now, this is handled when navigating to the TV series page, which renders this component.
export default async function ValidateWatchedStatus({
  id,
}: Readonly<{
  id: number;
}>) {
  const { user } = await auth();
  if (!user) {
    return null;
  }

  const tvSeries = await cachedTvSeries(id);
  if (!tvSeries) {
    return null;
  }

  const [watchedCount, isInWatchedList, isInProgressList] = await Promise.all([
    getWatchedCountForTvSeries({
      userId: user.id,
      tvSeries,
    }),
    isInList({
      userId: user.id,
      listId: 'WATCHED',
      id: tvSeries.id,
    }),
    isInList({
      userId: user.id,
      listId: 'IN_PROGRESS',
      id: tvSeries.id,
    }),
  ]);

  const tvSeriesIsWatched =
    watchedCount > 0 && watchedCount === tvSeries.numberOfAiredEpisodes;
  const tvSeriesIsInProgress = watchedCount > 0 && !tvSeriesIsWatched;
  const tvSeriesIsNotWatchedNorInProgress = watchedCount === 0;

  const item = {
    id: tvSeries.id,
    title: tvSeries.title,
    slug: tvSeries.slug,
    posterPath: tvSeries.posterPath,
  };

  // 1. If series was marked as watched but is now partially watched, move to "in progress"
  if (isInWatchedList && tvSeriesIsInProgress) {
    await Promise.all([
      addToList({
        userId: user.id,
        listId: 'IN_PROGRESS',
        item,
      }),
      removeFromList({
        userId: user.id,
        listId: 'WATCHED',
        id: tvSeries.id,
      }),
      removeFromWatchlist({
        userId: user.id,
        id: tvSeries.id,
      }),
    ]);
  }
  // 2. If all episodes are now watched but series isn't in watched list, move to "watched"
  else if (tvSeriesIsWatched && !isInWatchedList) {
    await Promise.all([
      addToList({
        userId: user.id,
        listId: 'WATCHED',
        item,
      }),
      removeFromList({
        userId: user.id,
        listId: 'IN_PROGRESS',
        id: tvSeries.id,
      }),
      removeFromWatchlist({
        userId: user.id,
        id: tvSeries.id,
      }),
    ]);
  }
  // 3. Clean up "in progress" list if series is fully watched or not even started
  else if (
    isInProgressList &&
    (tvSeriesIsWatched || tvSeriesIsNotWatchedNorInProgress)
  ) {
    await removeFromList({
      userId: user.id,
      listId: 'IN_PROGRESS',
      id: tvSeries.id,
    });
  }

  return null;
}
