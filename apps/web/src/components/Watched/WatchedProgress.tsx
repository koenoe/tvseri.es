'use client';

import type { TvSeries } from '@tvseri.es/types';
import Progress from '../Progress/Progress';
import { useWatchedStore } from './WatchedStoreProvider';

export default function WatchedProgress({
  tvSeries,
}: Readonly<{
  tvSeries: TvSeries;
}>) {
  const totalRuntime = useWatchedStore(
    (store) => store.getWatchedProgress(tvSeries.id).totalRuntime,
  );
  const numberOfWatched = useWatchedStore(
    (store) => store.getWatchedProgress(tvSeries.id).numberOfWatched,
  );

  return (
    <Progress
      className="my-6 lg:w-9/12"
      numberOfEpisodes={
        tvSeries.numberOfAiredEpisodes || tvSeries.numberOfEpisodes || 0
      }
      numberOfWatched={numberOfWatched}
      runtime={totalRuntime}
    />
  );
}
