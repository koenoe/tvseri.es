'use client';

import { useCallback, useEffect, useReducer } from 'react';

import type { Loader } from './createLoader';

/**
 * A `createLoader` chunk in a component: its value (null until it is in, and
 * after a failure) and `load`, which fetches it and renders again once it
 * is in. A failed chunk is forgotten (see `createLoader`) and `load` tries
 * it again on the next call.
 *
 * `wanted` loads it as an effect: whenever it changes to something other
 * than null, undefined or false and the chunk isn't in, so a failed chunk is
 * tried again at the next open (a changed key).
 */
export function useLoader<T>(
  loader: Loader<T>,
  wanted?: string | number | boolean | null,
): readonly [value: T | null, load: () => void] {
  const [, loaded] = useReducer((count: number) => count + 1, 0);
  const load = useCallback(() => {
    loader.load().then(loaded, () => undefined);
  }, [loader]);
  useEffect(() => {
    if (
      wanted !== undefined &&
      wanted !== null &&
      wanted !== false &&
      !loader.get()
    ) {
      load();
    }
  }, [load, loader, wanted]);
  return [loader.get(), load];
}
