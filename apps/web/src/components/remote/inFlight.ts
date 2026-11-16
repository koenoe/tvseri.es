import { useSyncExternalStore } from 'react';

import type { EpisodeRef } from './types';

type Mark = Readonly<{
  episode: EpisodeRef | 'next';
  promise: Promise<unknown>;
}>;

/**
 * The big key's marks still on their way, per show, outside any one open
 * Remote: closing and reopening the ⋯ keeps “Marking S03E05…”,
 * and a second N while the first is out joins it instead of marking the
 * episode after.
 */
const marks = new Map<number, Mark>();
const listeners = new Set<() => void>();

const emit = () => {
  for (const listener of listeners) {
    listener();
  }
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Runs `run` unless a mark for this show is already out; then joins it. */
export function markNextOnce(
  seriesId: number,
  episode: EpisodeRef | 'next',
  run: () => Promise<unknown>,
): Promise<unknown> {
  const current = marks.get(seriesId);
  if (current) {
    return current.promise;
  }
  const promise = run().finally(() => {
    marks.delete(seriesId);
    emit();
  });
  marks.set(seriesId, { episode, promise });
  emit();
  return promise;
}

/** The episode the big key is marking for this show, or null. */
export function usePendingMark(seriesId: number): EpisodeRef | 'next' | null {
  return useSyncExternalStore(
    subscribe,
    () => marks.get(seriesId)?.episode ?? null,
    () => null,
  );
}
