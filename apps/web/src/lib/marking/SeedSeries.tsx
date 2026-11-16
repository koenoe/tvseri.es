'use client';

import { useLayoutEffect, useMemo } from 'react';

import { useMarkingStoreApi } from './MarkingProvider';
import type { SeriesSeed } from './types';

/**
 * Seeds the marking store with a show from the page's loaders. The first seed
 * happens during render (also on the server, into that request's store), so
 * the first paint already shows the viewer's marks; later seeds (fresh data on
 * a revisit) apply in a layout effect, with pending marks kept on top.
 * Render it before the controls that read the show.
 */
export default function SeedSeries({ seed }: Readonly<{ seed: SeriesSeed }>) {
  const store = useMarkingStoreApi();
  const key = useMemo(() => JSON.stringify(seed), [seed]);
  if (!store.getState().series[seed.seriesId]) {
    // Subscribers mounted elsewhere hear of it after this render
    store.seedInRender(seed, key);
  }
  useLayoutEffect(() => {
    store.getState().seed(seed, key);
  }, [store, seed, key]);
  return null;
}
