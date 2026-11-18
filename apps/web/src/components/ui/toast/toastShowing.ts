'use client';

import { useSyncExternalStore } from 'react';

/**
 * Whether a toast is on screen, for UI that should wait for it: a Library
 * tile stays until its mark's toast (and its Undo) has gone, however long
 * hover or focus kept the toast up.
 */
let showing = false;
const listeners = new Set<() => void>();

export function setToastShowing(next: boolean) {
  if (next === showing) {
    return;
  }
  showing = next;
  for (const listener of listeners) {
    listener();
  }
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const read = () => showing;
const readServer = () => false;

export const useToastShowing = () =>
  useSyncExternalStore(subscribe, read, readServer);
