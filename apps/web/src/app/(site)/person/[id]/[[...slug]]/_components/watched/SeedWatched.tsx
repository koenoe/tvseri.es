'use client';

import type { PersonWatchedItem } from '@tvseri.es/schemas';
import { useLayoutEffect } from 'react';

import { useWatchedStore } from './store';

/** Hands the viewer's marks to the cached Career and Shows (client only). */
export default function SeedWatched({
  items,
  personId,
}: Readonly<{
  items: ReadonlyArray<PersonWatchedItem>;
  personId: number;
}>) {
  const seed = useWatchedStore((state) => state.seed);
  useLayoutEffect(() => {
    seed(personId, items);
  }, [items, personId, seed]);
  return null;
}
