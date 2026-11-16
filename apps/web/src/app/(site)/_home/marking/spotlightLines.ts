'use client';

import type { SpotlightLine, SpotlightLines } from '@tvseri.es/schemas';
import { useCallback, useSyncExternalStore } from 'react';

import { useIsSignedIn } from '@/lib/marking/hooks';

/** The sentence for a signed-in spotlight line */
export function spotlightLineText(line: SpotlightLine): string {
  switch (line.kind) {
    case 'favorite':
      return `Like ${line.title}, which you favourited`;
    case 'finished':
      return `Like ${line.title}, which you finished`;
    case 'up-to-date':
      return `Like ${line.title}, which you are up to date with`;
    case 'top-rated':
      return `Top rated in ${line.genre} that you haven’t seen`;
  }
}

type Lines = SpotlightLines['lines'];

const EMPTY: Lines = {};

let lines: Lines = EMPTY;
let requested = false;
const listeners = new Set<() => void>();

function load() {
  if (requested) {
    return;
  }
  requested = true;
  fetch('/api/me/spotlight-lines', { credentials: 'same-origin' })
    .then((response) => (response.ok ? response.json() : null))
    .then((body: SpotlightLines | null) => {
      lines = body?.lines ?? EMPTY;
      for (const listener of listeners) {
        listener();
      }
    })
    .catch(() => undefined);
}

/**
 * Signed in, the personal line per spotlight show (one call per tab, for the
 * API's own trending list); empty signed out and until it arrives, so the
 * hook line shows first and the personal one replaces it.
 */
export function useSpotlightLines(): Lines {
  const signedIn = useIsSignedIn();
  // Subscribing starts the one fetch (signed in only)
  const subscribe = useCallback(
    (listener: () => void) => {
      listeners.add(listener);
      if (signedIn) {
        load();
      }
      return () => {
        listeners.delete(listener);
      };
    },
    [signedIn],
  );
  return useSyncExternalStore(
    subscribe,
    () => lines,
    () => EMPTY,
  );
}
