import { cachedTvSeries } from '@/app/cached';
import auth from '@/auth';
import { getAllWatchedForTvSeries } from '@/lib/api';

import AddTvSeriesToStore from './AddTvSeriesToStore';

export default async function AddTvSeriesToStoreContainer({
  id,
}: Readonly<{
  id: number;
}>) {
  const [tvSeriesFromCache, { user }] = await Promise.all([
    cachedTvSeries(id),
    auth(),
  ]);
  const tvSeries = tvSeriesFromCache!;

  if (!user) {
    return <AddTvSeriesToStore tvSeries={tvSeries} watched={[]} />;
  }

  const watched = await getAllWatchedForTvSeries({
    seriesId: tvSeries.id,
    userId: user.id,
  });

  return <AddTvSeriesToStore tvSeries={tvSeries} watched={watched} />;
}
