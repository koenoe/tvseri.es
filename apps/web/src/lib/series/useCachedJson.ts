'use client';

import { useEffect, useSyncExternalStore } from 'react';

/**
 * A tab-wide cache of public JSON reads for the show page's client parts
 * (CDN-cached route handlers, and Home's and the profile's Up next titles
 * through `useSeasonEpisodes`): each URL loads once and every reader shares
 * it; a failed load is tried again by the next reader (or a Try again), and
 * readers of the failure see the retry load.
 */
type Entry<T> = Readonly<
  { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: T }
>;

const cache = new Map<string, Entry<unknown>>();
const listeners = new Set<() => void>();

const emit = () => {
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
 * Seeds `url` with data the page already has (call during render, client
 * only: the module cache must not outlive a server request). A loaded entry
 * is kept.
 */
export function primeJson(url: string, data: unknown) {
  if (cache.get(url)?.status !== 'ready') {
    cache.set(url, { data, status: 'ready' });
  }
}

/**
 * A JSON read from this site's route handlers, public or the viewer's own
 * (the session cookie goes along); a non-2xx answer rejects like a network
 * failure.
 */
export async function fetchJson<T>(
  url: string,
  init?: Readonly<{ signal?: AbortSignal }>,
): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`${response.status}`);
  }
  return (await response.json()) as T;
}

/** Starts loading `url` (no-op when loaded or loading). */
export function requestJson(url: string) {
  const current = cache.get(url);
  if (current && current.status !== 'error') {
    return;
  }
  cache.set(url, { status: 'loading' });
  emit();
  fetchJson(url)
    .then((data) => {
      cache.set(url, { data, status: 'ready' });
    })
    .catch(() => {
      cache.set(url, { status: 'error' });
    })
    .finally(emit);
}

/** Loading reads as "nothing yet", so a load's start re-renders only readers of a failure. */
const snapshotOf = (url: string | null) => {
  const entry = url ? cache.get(url) : undefined;
  return entry?.status === 'loading' ? undefined : entry;
};

/**
 * `url`'s body: `undefined` while loading (or without a url), `null` when it
 * failed. Hydration renders it as loading, as the server did, unless
 * `hydrateFromCache` (a primed entry is drawn at once).
 */
export default function useCachedJson<T>(
  url: string | null,
  hydrateFromCache = false,
): T | null | undefined {
  const entry = useSyncExternalStore(
    subscribe,
    () => snapshotOf(url),
    () => (hydrateFromCache ? snapshotOf(url) : undefined),
  ) as Entry<T> | undefined;
  useEffect(() => {
    if (url) {
      requestJson(url);
    }
  }, [url]);
  if (!entry || entry.status === 'loading') {
    return undefined;
  }
  return entry.status === 'ready' ? entry.data : null;
}
