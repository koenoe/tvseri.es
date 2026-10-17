import type { SQSBatchResponse, SQSEvent } from 'aws-lambda';

import {
  addToList,
  getAllListItems,
  isInList,
  removeFromList,
} from '@/lib/db/list';
import { getWatchedCountForTvSeries } from '@/lib/db/watched';
import { TMDB_CONCURRENCY } from '@/lib/tmdb';
import { createLimiter } from '@/utils/limit';
import { cachedTvSeries } from './shared/cachedTvSeries';
import type { ValidateWatchedStatusMessage } from './shared/validateWatchedStatusMessage';

/**
 * Validates one user's watched lists. Each message is handled on its own and
 * reported back as a batch item failure if it throws, so one failing user is
 * retried (and eventually sent to the DLQ) without re-running the others.
 */
const validateUser = async (user: ValidateWatchedStatusMessage) => {
  const watchedListItems = await getAllListItems({
    listId: 'WATCHED',
    userId: user.id,
  });

  const filteredWatchedListItems = watchedListItems.filter(
    (item) => item.status === 'Returning Series',
  );

  if (filteredWatchedListItems.length === 0) {
    return;
  }

  const limit = createLimiter(TMDB_CONCURRENCY);

  await Promise.all(
    filteredWatchedListItems.map((item) =>
      limit(async () => {
        const [tvSeries, watchedCount] = await Promise.all([
          cachedTvSeries(item.id),
          getWatchedCountForTvSeries({
            tvSeriesId: item.id,
            userId: user.id,
          }),
        ]);

        // Series no longer exists on TMDB: nothing to validate against
        if (!tvSeries) {
          console.warn(
            `[SKIP] | ${user.id} | No TV series found for ID "${item.id}"`,
          );
          return;
        }

        // Note: constants to make the code more readable
        const tvSeriesIsWatched =
          watchedCount > 0 && watchedCount >= tvSeries.numberOfAiredEpisodes;
        const tvSeriesIsInProgress = watchedCount > 0 && !tvSeriesIsWatched;
        const tvSeriesIsNotWatchedAtAll = watchedCount === 0;

        const twoWeeksFromNow = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
        const tvSeriesIsResumingSoon =
          tvSeries.nextEpisodeToAir &&
          new Date(tvSeries.nextEpisodeToAir.airDate) <= twoWeeksFromNow;

        if (tvSeriesIsWatched && tvSeriesIsResumingSoon) {
          const isCurrentlyInResumingSoon = await isInList({
            id: tvSeries.id,
            listId: 'RESUMING_SOON',
            userId: user.id,
          });

          if (!isCurrentlyInResumingSoon) {
            console.log(
              `[UPDATE] | ${user.id} | ${tvSeries.title} | Added to RESUMING_SOON (new episodes within 2 weeks)`,
            );
            await addToList({
              item: {
                createdAt: Date.now(),
                id: tvSeries.id,
                posterPath: tvSeries.posterPath,
                slug: tvSeries.slug,
                status: tvSeries.status,
                title: tvSeries.title,
              },
              listId: 'RESUMING_SOON',
              userId: user.id,
            });
          }
        }

        if (tvSeriesIsWatched) {
          return;
        }

        if (tvSeriesIsInProgress) {
          const isCurrentlyInWatched = await isInList({
            id: tvSeries.id,
            listId: 'WATCHED',
            userId: user.id,
          });

          if (isCurrentlyInWatched) {
            console.log(
              `[UPDATE] | ${user.id} | ${tvSeries.title} | Moved from WATCHED to IN_PROGRESS | ${watchedCount}/${tvSeries.numberOfAiredEpisodes}`,
            );
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
              removeFromList({
                id: tvSeries.id,
                listId: 'RESUMING_SOON',
                userId: user.id,
              }),
            ]);
          }
        }

        // Note: should never happen, but just in case
        if (tvSeriesIsNotWatchedAtAll) {
          console.log(
            `[UPDATE] | ${user.id} | ${tvSeries.title} | Removing from all lists (no episodes watched) | ${watchedCount}/${tvSeries.numberOfAiredEpisodes}`,
          );
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
            removeFromList({
              id: tvSeries.id,
              listId: 'RESUMING_SOON',
              userId: user.id,
            }),
          ]);
        }
      }),
    ),
  );
};

export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  const batchItemFailures: SQSBatchResponse['batchItemFailures'] = [];

  // Sequential on purpose: each user already fans out over their series
  for (const record of event.Records) {
    try {
      await validateUser(
        JSON.parse(record.body) as ValidateWatchedStatusMessage,
      );
    } catch (error) {
      console.error(
        `Error processing validate watched status event ${record.messageId}:`,
        error,
      );
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
};
