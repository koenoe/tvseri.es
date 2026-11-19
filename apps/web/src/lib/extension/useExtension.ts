'use client';

import type { ConnectionService } from '@tvseri.es/schemas';
import { useSyncExternalStore } from 'react';

import type { BrowserSupport } from './browserSupport';
import {
  type ExtensionCheck,
  type ExtensionFound,
  pingExtension,
  readRuntime,
} from './extension';

/** `unsupported` is the server's call; `found` is null when nothing answered */
export type ExtensionPing =
  | Readonly<{ state: 'checking' }>
  | Readonly<{ state: 'unsupported' }>
  | Readonly<{ found: ExtensionFound | null; state: 'answered' }>;

const CHECKING: ExtensionPing = { state: 'checking' };
const UNSUPPORTED: ExtensionPing = { state: 'unsupported' };

/**
 * One ping per page, shared by every card. Asked again whenever the tab
 * shows, as the viewer may have installed it in another tab.
 */
let snapshot: ExtensionPing = CHECKING;
const listeners = new Set<() => void>();
// Bumped when the last listener leaves: an answer to an older round is dropped
let round = 0;

/** The same answer keeps the same snapshot, so no card renders for nothing */
const sameAnswer = (found: ExtensionFound | null) =>
  snapshot.state === 'answered' &&
  snapshot.found?.id === found?.id &&
  snapshot.found?.version === found?.version &&
  snapshot.found?.services.join() === found?.services.join();

const ask = () => {
  const asked = round;
  // A ping that throws reads as one nothing answered: not installed
  pingExtension(readRuntime())
    .catch(() => null)
    .then((found) => {
      if (asked !== round || sameAnswer(found)) {
        return;
      }
      snapshot = { found, state: 'answered' };
      for (const listener of listeners) {
        listener();
      }
    });
};

const onVisible = () => {
  if (!document.hidden) {
    ask();
  }
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  if (listeners.size === 1) {
    document.addEventListener('visibilitychange', onVisible);
    ask();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      document.removeEventListener('visibilitychange', onVisible);
      round += 1;
      snapshot = CHECKING;
    }
  };
};

const subscribeNothing = () => () => undefined;
const readPing = () => snapshot;
const checkingOnServer = () => CHECKING;

/**
 * `browser` comes from the request's headers, so an unsupported browser
 * paints its state from the first frame; only the ping waits.
 */
export function useExtensionPing(
  needed: boolean,
  browser: BrowserSupport,
): ExtensionPing {
  const supported = browser === 'supported';
  const ping = useSyncExternalStore(
    needed && supported ? subscribe : subscribeNothing,
    readPing,
    checkingOnServer,
  );
  return supported ? ping : UNSUPPORTED;
}

export type Extension = Readonly<{
  check: ExtensionCheck;
  /** The installed extension's id, to hand it the link code */
  id: string | null;
}>;

/** Whether the extension can link `service`; `needed`: not linked, or signed out */
export default function useExtension(
  service: ConnectionService,
  needed: boolean,
  browser: BrowserSupport,
): Extension {
  const ping = useExtensionPing(needed, browser);
  if (ping.state !== 'answered') {
    return { check: ping.state, id: null };
  }
  const { found } = ping;
  if (!found) {
    return { check: 'missing', id: null };
  }
  return found.services.includes(service)
    ? { check: 'present', id: found.id }
    : { check: 'outdated', id: null };
}
