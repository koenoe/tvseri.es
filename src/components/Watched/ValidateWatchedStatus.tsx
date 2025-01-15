import auth from '@/lib/auth';
import { cachedTvSeries } from '@/lib/cached';
import { addToList, isInList, removeFromList } from '@/lib/db/list';
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

  const [tvSeriesIsWatched, isInWatchedList] = await Promise.all([
    (async () => {
      const watchedCount = await getWatchedCountForTvSeries({
        userId: user.id,
        tvSeries,
      });
      return watchedCount === tvSeries.numberOfEpisodes;
    })(),
    isInList({
      userId: user.id,
      listId: 'WATCHED',
      id: tvSeries.id,
    }),
  ]);

  if (isInWatchedList && !tvSeriesIsWatched) {
    await Promise.all([
      addToList({
        userId: user.id,
        listId: 'IN_PROGRESS',
        item: {
          id: tvSeries.id,
          title: tvSeries.title,
          slug: tvSeries.slug,
          posterPath: tvSeries.posterPath,
        },
      }),
      removeFromList({
        userId: user.id,
        listId: 'WATCHED',
        id: tvSeries.id,
      }),
    ]);
  }

  return null;
}
