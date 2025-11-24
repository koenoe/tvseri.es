'use client';

import type { TvSeries, WatchedItem } from '@tvseri.es/schemas';
import { useEffect, useRef } from 'react';

import { useWatchedStore } from './WatchedStoreProvider';

export default function AddTvSeriesToStore({
  tvSeries,
  watched,
}: Readonly<{ tvSeries: TvSeries; watched: WatchedItem[] }>) {
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
