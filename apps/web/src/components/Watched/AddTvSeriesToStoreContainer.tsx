import auth from '@/auth';
import { getWatchedProgressForTvSeries } from '@/lib/api';

import AddTvSeriesToStore from './AddTvSeriesToStore';
import type { WatchedStoreTvSeries } from './toWatchedStoreTvSeries';

export default async function AddTvSeriesToStoreContainer({
  tvSeries,
}: Readonly<{
  tvSeries: WatchedStoreTvSeries;
}>) {
  const { user } = await auth();

  if (!user) {
    return <AddTvSeriesToStore tvSeries={tvSeries} watched={[]} />;
  }

  // Lean response: exactly the fields the store keeps
  const watched = await getWatchedProgressForTvSeries({
    seriesId: tvSeries.id,
    userId: user.id,
  });

  return <AddTvSeriesToStore tvSeries={tvSeries} watched={watched} />;
}
