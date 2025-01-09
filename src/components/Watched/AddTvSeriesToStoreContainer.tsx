import auth from '@/lib/auth';
import { cachedTvSeries } from '@/lib/cached';
import { getAllWatchedForTvSeries } from '@/lib/db/watched';

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
    userId: user.id,
    tvSeries,
  });

  return <AddTvSeriesToStore tvSeries={tvSeries} watched={watched} />;
}
