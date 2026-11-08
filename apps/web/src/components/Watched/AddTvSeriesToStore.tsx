'use client';

import { useEffect, useRef } from 'react';

import type { WatchedItemForStore } from './store';
import type { WatchedStoreTvSeries } from './toWatchedStoreTvSeries';
import { useWatchedStore } from './WatchedStoreProvider';

export default function AddTvSeriesToStore({
  tvSeries,
  watched,
}: Readonly<{
  tvSeries: WatchedStoreTvSeries;
  watched: ReadonlyArray<WatchedItemForStore>;
}>) {
  const lastAddedTvSeriesId = useRef<number | null>(null);
  const addTvSeries = useWatchedStore((state) => state.addTvSeries);

  useEffect(() => {
    if (lastAddedTvSeriesId.current === tvSeries.id) {
      return;
    }

    addTvSeries(tvSeries, watched);

    lastAddedTvSeriesId.current = tvSeries.id;
  }, [addTvSeries, tvSeries, watched]);

  return null;
}
