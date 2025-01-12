import auth from '@/lib/auth';
import { cachedTvSeries } from '@/lib/cached';
import { addToList, isInList, removeFromList } from '@/lib/db/list';
import {
  getLastWatchedItemForTvSeries,
  isTvSeriesWatched,
} from '@/lib/db/watched';

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

  const [tvSeriesIsWatched, isInWatchedList, lastWatchedItem] =
    await Promise.all([
      isTvSeriesWatched({
        userId: user.id,
        tvSeries,
      }),
      isInList({
        userId: user.id,
        listId: 'WATCHED',
        id: tvSeries.id,
      }),
      getLastWatchedItemForTvSeries({
        userId: user.id,
        tvSeries,
      }),
    ]);

  if (!isInWatchedList && tvSeriesIsWatched) {
    await Promise.all([
      addToList({
        userId: user.id,
        listId: 'WATCHED',
        item: {
          id: tvSeries.id,
          title: tvSeries.title,
          slug: tvSeries.slug,
          posterPath: tvSeries.posterPath,
          createdAt: lastWatchedItem?.watchedAt,
        },
      }),
      removeFromList({
        userId: user.id,
        listId: 'IN_PROGRESS',
        id: tvSeries.id,
      }),
    ]);
    return null;
  }

  if (!tvSeriesIsWatched) {
    await removeFromList({
      userId: user.id,
      listId: 'WATCHED',
      id: tvSeries.id,
    });
  }

  return null;
}
