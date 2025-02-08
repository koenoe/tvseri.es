import { cachedTvSeries } from '@/app/cached';
import auth from '@/auth';
import {
  addToList,
  isInList,
  removeFromList,
  removeFromWatchlist,
} from '@/lib/db/list';
import {
  getLastWatchedItemForTvSeries,
  getWatchedCountForTvSeries,
} from '@/lib/db/watched';

// Note: The DynamoDB subscriber (`src/lambdas/watched.ts`) handles marking a TV series as watched or in progress.
// However, a series marked as watched may later have new episodes added.
// In such cases, the series should be moved from the "watched" list to the "in progress" list.
// We never automatically add series to "in progress" if they aren't in any list already,
// as users may have manually removed them and we want to respect that choice.
// Note that the Lambda will still add series to "in progress" on new watch events
// (e.g., if a user removes a show from "in progress" but later watches more episodes),
// as this represents active user intent to watch the show.
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

  const [watchedCount, lastWatchedItem, isInWatchedList, isInProgressList] =
    await Promise.all([
      getWatchedCountForTvSeries({
        userId: user.id,
        tvSeriesId: tvSeries.id,
      }),
      getLastWatchedItemForTvSeries({
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
    status: tvSeries.status,
  };

  // First handle active transitions between lists. While most state changes are handled by
  // the Lambda watch handler, these transitions can occur when:
  // - New episodes are released for a previously watched series
  // - Episodes are removed/corrected in the TMDB
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
    // - Episode count corrections in TMDB
    await Promise.all([
      addToList({
        userId: user.id,
        listId: 'WATCHED',
        item: {
          ...item,
          createdAt: lastWatchedItem?.watchedAt,
        },
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
  // - Data corrections in TMDB
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
    // - Episode count corrections in TMDB
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
