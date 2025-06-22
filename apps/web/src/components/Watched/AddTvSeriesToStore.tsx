'use client';

import { useEffect, useRef } from 'react';

import { type TvSeries, type WatchedItem } from '@tvseri.es/types';

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
