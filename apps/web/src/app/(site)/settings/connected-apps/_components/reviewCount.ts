'use client';

import type { ConnectionService } from '@tvseri.es/schemas';
import { useLayoutEffect, useSyncExternalStore } from 'react';

/**
 * Each card's review list as it stands, fixes and Skips included before
 * the server has counted them, for the sync row's "N to review" above it.
 * The list and the row are siblings the server renders apart, so the
 * count goes through this small store rather than props.
 */
const counts = new Map<ConnectionService, number>();
const listeners = new Set<() => void>();

const changed = () => {
  for (const listener of listeners) {
    listener();
  }
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * The list publishes its count while it is on the page. A layout effect,
 * so the row redraws in the same frame as the list
 */
export function usePublishReviewCount(
  service: ConnectionService,
  count: number,
) {
  useLayoutEffect(() => {
    counts.set(service, count);
    changed();
    return () => {
      counts.delete(service);
      changed();
    };
  }, [count, service]);
}

/** The list's live count; undefined while no list is on the page */
export function useReviewCount(service: ConnectionService): number | undefined {
  return useSyncExternalStore(
    subscribe,
    () => counts.get(service),
    () => undefined,
  );
}
