'use client';

import { useSyncExternalStore } from 'react';

import { createLoader } from '@/lib/lazy/createLoader';

import { loadMaxFeatures } from './MotionProvider';

type MaxFeatures = Awaited<ReturnType<typeof loadMaxFeatures>>;

const max = createLoader(loadMaxFeatures);
const listeners = new Set<() => void>();

/**
 * Loads `domMax` once for the page. Resolves with it, or with null when the
 * chunk failed (a flaky network): the next call (the next interaction) then
 * tries again. Never rejects.
 */
export function loadMax(): Promise<MaxFeatures | null> {
  return max.load().then(
    (loaded) => {
      for (const listener of listeners) {
        listener();
      }
      return loaded;
    },
    () => null,
  );
}

/** Whether `domMax` is in already (a sync check for event handlers) */
export const isMaxLoaded = (): boolean => max.get() !== null;

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  void loadMax();
  return () => {
    listeners.delete(onChange);
  };
}

/**
 * `LazyMotion`'s features while `domMax` isn't there: a load that never
 * resolves, so the `m` elements stay plain until a render hands it the
 * loaded bundle (`LazyMotion` then loads it in that same render).
 */
export const NOT_YET = () => new Promise<never>(() => {});

const getSnapshot = () => max.get();
const getServerSnapshot = () => null;

/**
 * `domMax` as a plain bundle once its chunk has loaded (null before, after
 * a failed load, and on the server), for `MaxMotion` and `ArmedMaxMotion`,
 * which switch a `LazyMotion` to it in the same render that needs it.
 */
export default function useMaxFeatures(): MaxFeatures | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
