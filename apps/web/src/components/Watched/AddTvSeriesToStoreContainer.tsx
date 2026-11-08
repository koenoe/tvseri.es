import auth from '@/auth';
import { getAllWatchedForTvSeries } from '@/lib/api';

import AddTvSeriesToStore from './AddTvSeriesToStore';
import { toWatchedItemForStore } from './store';
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

  const watchedItems = await getAllWatchedForTvSeries({
    seriesId: tvSeries.id,
    userId: user.id,
  });
  // Note: only send the fields the store keeps
  const watched = watchedItems.map(toWatchedItemForStore);

  return <AddTvSeriesToStore tvSeries={tvSeries} watched={watched} />;
}
