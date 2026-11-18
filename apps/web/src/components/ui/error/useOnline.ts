'use client';

import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void) {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

const fromNavigator = () => navigator.onLine;
// The server (and hydration) assumes online; the client corrects it.
const onServer = () => true;

/** `navigator.onLine`, kept current by the `online`/`offline` events. */
export default function useOnline(): boolean {
  return useSyncExternalStore(subscribe, fromNavigator, onServer);
}
