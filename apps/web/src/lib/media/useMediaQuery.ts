'use client';

import { useSyncExternalStore } from 'react';

type Query = Readonly<{
  /** The `matchMedia` it came from (a test may stub another) */
  source: Window['matchMedia'] | undefined;
  subscribe: (onChange: () => void) => () => void;
  getSnapshot: () => boolean;
}>;

/** One `MediaQueryList` and one `change` listener per query, however many components read it */
const queries = new Map<string, Query>();

function queryFor(query: string): Query {
  const source =
    typeof window.matchMedia === 'function' ? window.matchMedia : undefined;
  let entry = queries.get(query);
  if (entry && entry.source === source) {
    return entry;
  }
  const list = source ? window.matchMedia(query) : null;
  const listeners = new Set<() => void>();
  const notify = () => {
    for (const listener of listeners) {
      listener();
    }
  };
  entry = {
    getSnapshot: () => list?.matches ?? false,
    source,
    subscribe: (onChange) => {
      if (listeners.size === 0) {
        list?.addEventListener('change', notify);
      }
      listeners.add(onChange);
      return () => {
        listeners.delete(onChange);
        if (listeners.size === 0) {
          list?.removeEventListener('change', notify);
        }
      };
    },
  };
  queries.set(query, entry);
  return entry;
}

const getServerSnapshot = () => false;

/**
 * Whether a media query matches, kept in sync with the viewport:
 * the app's one media-query hook, for the queries in `./breakpoints`. False
 * on the server and during hydration, so server and client markup agree.
 * Every reader of a query shares one `MediaQueryList` and one listener, and
 * a render reads its cached `matches` instead of calling `matchMedia`.
 */
export default function useMediaQuery(query: string): boolean {
  const entry = typeof window === 'undefined' ? null : queryFor(query);
  return useSyncExternalStore(
    entry?.subscribe ?? noSubscribe,
    entry?.getSnapshot ?? getServerSnapshot,
    getServerSnapshot,
  );
}

const noSubscribe = () => () => {};

/** For a one-off read outside React (an effect, a ref callback) */
export function matchesNow(query: string): boolean {
  return queryFor(query).getSnapshot();
}

/**
 * Follows a query outside a component render (another store's subscribe):
 * the same shared `MediaQueryList` and single `change` listener as the hook.
 * Returns the unsubscribe.
 */
export function subscribeMediaQuery(
  query: string,
  onChange: () => void,
): () => void {
  return queryFor(query).subscribe(onChange);
}
