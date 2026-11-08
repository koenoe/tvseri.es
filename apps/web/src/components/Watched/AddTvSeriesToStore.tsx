'use client';

import type { TvSeries } from '@tvseri.es/schemas';
import { useEffect, useRef } from 'react';

import type { WatchedItemForStore } from './store';
import { useWatchedStore } from './WatchedStoreProvider';

export default function AddTvSeriesToStore({
  tvSeries,
  watched,
}: Readonly<{
  tvSeries: TvSeries;
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
