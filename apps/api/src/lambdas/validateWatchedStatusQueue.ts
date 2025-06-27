import type { TvSeries, User } from '@tvseri.es/types';
import type { SQSEvent, SQSHandler } from 'aws-lambda';

import { addToList, getAllListItems, removeFromList } from '@/lib/db/list';
import { getWatchedCountForTvSeries } from '@/lib/db/watched';
import { fetchTvSeries } from '@/lib/tmdb';

/**
 * Module-level cache for TV series data that persists between Lambda invocations.
 * TV series data is the same for all users, so we can safely cache it at module level.
 */
const tvSeriesCache = new Map<string, TvSeries | null>();

const cachedTvSeries = async (id: number) => {
  const cacheKey = `validate-watched-status-queue:${id}`;

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
        listId: 'WATCHED',
        userId: user.id,
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
                tvSeriesId: item.id,
                userId: user.id,
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

            console.log(
              `[UPDATE] | ${user.id} | ${tvSeries.title} | ${watchedCount}/${tvSeries.numberOfAiredEpisodes}`,
              {
                tvSeriesIsInProgress,
                tvSeriesIsNotWatchedNorInProgress,
                tvSeriesIsWatched,
              },
            );

            // Note: there's new episodes to watch, move series to in progress
            if (tvSeriesIsInProgress) {
              await Promise.all([
                addToList({
                  item: {
                    createdAt: Date.now(),
                    id: tvSeries.id,
                    posterPath: tvSeries.posterPath,
                    slug: tvSeries.slug,
                    status: tvSeries.status,
                    title: tvSeries.title,
                  },
                  listId: 'IN_PROGRESS',
                  userId: user.id,
                }),
                removeFromList({
                  id: tvSeries.id,
                  listId: 'WATCHED',
                  userId: user.id,
                }),
              ]);
            }

            // Note: should never happen, but just in case
            if (tvSeriesIsNotWatchedNorInProgress) {
              await Promise.all([
                removeFromList({
                  id: tvSeries.id,
                  listId: 'IN_PROGRESS',
                  userId: user.id,
                }),
                removeFromList({
                  id: tvSeries.id,
                  listId: 'WATCHED',
                  userId: user.id,
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
