import { type SQSHandler, type SQSEvent } from 'aws-lambda';

import { addToList, getAllListItems, removeFromList } from '@/lib/db/list';
import { getWatchedCountForTvSeries } from '@/lib/db/watched';
import { fetchTvSeries } from '@/lib/tmdb';
import { type TvSeries } from '@/types/tv-series';
import { type User } from '@/types/user';

/**
 * Module-level cache for TV series data that persists between Lambda invocations.
 * TV series data is the same for all users, so we can safely cache it at module level.
 */
const tvSeriesCache = new Map<string, TvSeries | null>();

const cachedTvSeries = async (id: number) => {
  const cacheKey = `${id}`;

  if (tvSeriesCache.has(cacheKey)) {
    return tvSeriesCache.get(cacheKey);
  }

  const tvSeries = await fetchTvSeries(id);
  tvSeriesCache.set(cacheKey, tvSeries ?? null);

  return tvSeries;
};

export const handler: SQSHandler = async (event: SQSEvent) => {
  try {
    for (const record of event.Records) {
      const user = JSON.parse(record.body) as User;

      const watchedListItems = await getAllListItems({
        userId: user.id,
        listId: 'WATCHED',
      });

      const filteredWatchedListItems = watchedListItems.filter(
        (item) => item.status === 'Returning Series',
      );

      if (filteredWatchedListItems.length === 0) {
        continue;
      }

      await Promise.all(
        filteredWatchedListItems.map((item) => {
          return (async () => {
            const [tvSeries_, watchedCount] = await Promise.all([
              cachedTvSeries(item.id),
              getWatchedCountForTvSeries({
                userId: user.id,
                tvSeriesId: item.id,
              }),
            ]);

            // Note: constants to make the code more readable
            const tvSeries = tvSeries_!;
            const tvSeriesIsWatched =
              watchedCount > 0 &&
              watchedCount === tvSeries.numberOfAiredEpisodes;
            const tvSeriesIsInProgress = watchedCount > 0 && !tvSeriesIsWatched;
            const tvSeriesIsNotWatchedNorInProgress = watchedCount === 0;

            // Note: series still watched, no need to move it to in progress
            if (tvSeriesIsWatched) {
              return;
            }

            // Note: there's new episodes to watch, move series to in progress
            if (tvSeriesIsInProgress) {
              await Promise.all([
                addToList({
                  userId: user.id,
                  listId: 'IN_PROGRESS',
                  item: {
                    id: tvSeries.id,
                    posterPath: tvSeries.posterPath,
                    slug: tvSeries.slug,
                    status: tvSeries.status,
                    title: tvSeries.title,
                    createdAt: Date.now(),
                  },
                }),
                removeFromList({
                  userId: user.id,
                  listId: 'WATCHED',
                  id: tvSeries.id,
                }),
              ]);
              return;
            }

            // Note: should never happen, but just in case
            if (tvSeriesIsNotWatchedNorInProgress) {
              await Promise.all([
                removeFromList({
                  userId: user.id,
                  listId: 'IN_PROGRESS',
                  id: tvSeries.id,
                }),
                removeFromList({
                  userId: user.id,
                  listId: 'WATCHED',
                  id: tvSeries.id,
                }),
              ]);
            }
          })();
        }),
      );
    }
  } catch (error) {
    console.error('Error processing validate watched status event:', error);
    throw error;
  }
};
