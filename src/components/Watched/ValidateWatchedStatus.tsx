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

  // First handle active transitions between lists. While most state changes are handled by
  // the Lambda watch handler, these transitions can occur when:
  // - New episodes are released for a previously watched series
  // - Episodes are removed/corrected in the external TV database
  // - Edge cases or failures in the Lambda handler

  if (isInWatchedList && tvSeriesIsInProgress) {
    // Series was marked as watched but is now partially watched
    // Most commonly happens when new episodes were released
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
    return null;
  }

  if (!isInWatchedList && tvSeriesIsWatched) {
    // Series is fully watched but not in watched list
    // This is usually handled by the Lambda but could occur from:
    // - Edge cases in the Lambda handler
    // - Episode count corrections in external TV database
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
    return null;
  }

  // Collect cleanup tasks for invalid states that could arise from:
  // - Data corrections in external TV database
  // - Edge cases in Lambda handler
  // - Network errors during list operations
  const cleanupTasks = [];

  if (isInProgressList && tvSeriesIsNotWatchedNorInProgress) {
    // Remove from "in progress" if no episodes are watched
    cleanupTasks.push(
      removeFromList({
        userId: user.id,
        listId: 'IN_PROGRESS',
        id: tvSeries.id,
      }),
    );
  }

  if (isInWatchedList && tvSeriesIsNotWatchedNorInProgress) {
    // Remove from "watched" list if no episodes are watched
    // Can occur due to:
    // - Episode count corrections in external TV database
    // - Edge cases in Lambda handler
    cleanupTasks.push(
      removeFromList({
        userId: user.id,
        listId: 'WATCHED',
        id: tvSeries.id,
      }),
    );
  }

  if (cleanupTasks.length > 0) {
    await Promise.all(cleanupTasks);
  }

  return null;
}
