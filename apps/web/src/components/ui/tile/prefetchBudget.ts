'use client';

import { useSyncExternalStore } from 'react';

/**
 * Bounds Next's viewport prefetch of a page that keeps failing to generate.
 * A successful prefetch is cached, so its page is fetched once (the route
 * tree and the page segment). A page whose render throws is never cached:
 * Next retries its segment about every 2 s, 4 times per document, and each
 * fetch runs a function.
 *
 * This counts the RSC fetches per path from the Resource Timing API (no
 * request is wrapped or delayed) while that path isn't the current page. A
 * path that reaches `LIMIT` stops prefetching in the viewport for the rest
 * of the tab: its tiles fall back to intent (hover, focus, touch).
 */
export const PREFETCH_FETCH_LIMIT = 4;

const counts = new Map<string, number>();
const listeners = new Set<() => void>();
let observing = false;

/** Counts one resource entry; exported for tests. */
export function countFetch(
  name: string,
  initiatorType: string,
  current: Location | URL,
): void {
  if (initiatorType !== 'fetch') {
    return;
  }
  let url: URL;
  try {
    url = new URL(name, current.href);
  } catch {
    return;
  }
  if (
    url.origin !== current.origin ||
    !url.searchParams.has('_rsc') ||
    url.pathname === current.pathname
  ) {
    return;
  }
  const count = (counts.get(url.pathname) ?? 0) + 1;
  counts.set(url.pathname, count);
  if (count === PREFETCH_FETCH_LIMIT) {
    for (const listener of listeners) {
      listener();
    }
  }
}

function observe() {
  if (observing || typeof PerformanceObserver === 'undefined') {
    return;
  }
  observing = true;
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as PerformanceResourceTiming[]) {
        countFetch(entry.name, entry.initiatorType, window.location);
      }
    }).observe({ buffered: true, type: 'resource' });
  } catch {
    // no resource timing: no bound
  }
}

function subscribe(onChange: () => void) {
  observe();
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

/** Has this path's page been fetched `LIMIT` times without being cached? */
export function isPrefetchExhausted(path: string): boolean {
  return (
    (counts.get(path.split(/[?#]/)[0] ?? path) ?? 0) >= PREFETCH_FETCH_LIMIT
  );
}

export function usePrefetchExhausted(path: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => isPrefetchExhausted(path),
    () => false,
  );
}
