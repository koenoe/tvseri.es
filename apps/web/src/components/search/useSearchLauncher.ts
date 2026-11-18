'use client';

import { type ComponentType, useEffect, useState } from 'react';

import whenIdle from '@/lib/lazy/whenIdle';
import {
  OPEN_SEARCH_EVENT,
  type OpenSearchDetail,
} from '@/lib/search/openSearch';
import { isMacPlatform, isSearchShortcut } from '@/lib/search/shortcut';
import { typeAhead } from '@/lib/search/typeAhead';

import loadOverlay from './loadOverlay';
import type { SearchOverlayProps } from './SearchOverlay';

/** The header's search button (bar and pill) and the 404's search field. */
const TRIGGERS = '[data-search-trigger]';

/** The overlay, once it is mounted (its field has focus from then on). */
const OVERLAY = 'dialog[aria-label="Search"]';

/** One open of the overlay; a new `id` mounts a fresh one (open again while the last one fades out). */
type Opening = OpenSearchDetail & Readonly<{ id: number; open: boolean }>;

let openings = 0;

const fresh = (detail: OpenSearchDetail): Opening => {
  openings += 1;
  return { ...detail, id: openings, open: true };
};

/** The overlay's idle preload: at most 4 s in, 1.5 s where idle callbacks are missing */
const IDLE_PRELOAD = { fallbackDelay: 1500, timeout: 4000 } as const;

/**
 * What opens search: `openSearch()` and ⌘K/⌘F (Ctrl elsewhere), the keys
 * typed while the overlay loads, and the overlay's idle or on-intent load.
 * Returns the current opening and the loaded overlay.
 */
export default function useSearchLauncher() {
  const [opening, setOpening] = useState<Opening | null>(null);
  const [Overlay, setOverlay] =
    useState<ComponentType<SearchOverlayProps> | null>(null);

  // Window listeners and the idle preload: no React-only alternative.
  useEffect(() => {
    let status: 'failed' | 'idle' | 'loading' | 'ready' = 'idle';
    // An open is waiting for the overlay's field to take focus: keys typed
    // meanwhile are kept (typeAhead) and the overlay opens with them.
    let awaitingField = false;
    const stopIntent = () => {
      document.removeEventListener('pointerover', onIntent);
      document.removeEventListener('focusin', onIntent);
    };
    const load = () => {
      if (status === 'loading' || status === 'ready') {
        return;
      }
      status = 'loading';
      loadOverlay().then(
        (module) => {
          status = 'ready';
          stopIntent();
          setOverlay(() => module.default);
          // search opens without a wait from here on (the e2e rig waits for it)
          document.documentElement.dataset.searchReady = '';
        },
        () => {
          // Retried on the next open; an open waiting for it is dropped.
          status = 'failed';
          awaitingField = false;
          setOpening(null);
        },
      );
    };
    // Load ahead of the open: hovering or focusing a search trigger, or
    // holding the shortcut's modifier.
    function onIntent(event: Event) {
      if (event.target instanceof Element && event.target.closest(TRIGGERS)) {
        load();
      }
    }
    const open = (detail: OpenSearchDetail) => {
      load();
      awaitingField = true;
      const next = fresh(detail);
      setOpening((current) => (current?.open ? current : next));
    };
    const onOpenEvent = (event: CustomEvent<OpenSearchDetail>) =>
      open(event.detail);
    const keepTyped = (event: KeyboardEvent) => {
      if (!awaitingField) {
        return false;
      }
      // the overlay focuses its field as it mounts: from then on it types
      if (document.querySelector(OVERLAY)) {
        awaitingField = false;
        return false;
      }
      if (typeAhead('', event) === null) {
        return false;
      }
      // not to the page (a focused trigger would take Space as a click)
      event.preventDefault();
      setOpening((current) =>
        current?.open
          ? { ...current, query: typeAhead(current.query ?? '', event) ?? '' }
          : current,
      );
      return true;
    };
    const isMac = isMacPlatform();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Meta' || event.key === 'Control') {
        load();
      }
      if (keepTyped(event)) {
        return;
      }
      if (!isSearchShortcut(event, isMac)) {
        return;
      }
      // Search couldn't load: leave ⌘F to the browser's find, and try again.
      if (status === 'failed' && event.key.toLowerCase() === 'f') {
        load();
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      load();
      // Opens one when none is on screen or on its way; closes a pending one
      // (an overlay on screen has the focus in its field already).
      awaitingField = !awaitingField && !document.querySelector(OVERLAY);
      const next = fresh({ trigger: null });
      setOpening((current) =>
        current?.open ? { ...current, open: false } : next,
      );
    };
    const cancelIdle = whenIdle(load, IDLE_PRELOAD);
    // listening: search opens from here on (the e2e rig waits for it)
    document.documentElement.dataset.searchListening = '';
    window.addEventListener(OPEN_SEARCH_EVENT, onOpenEvent);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerover', onIntent, { passive: true });
    document.addEventListener('focusin', onIntent);
    return () => {
      cancelIdle();
      window.removeEventListener(OPEN_SEARCH_EVENT, onOpenEvent);
      document.removeEventListener('keydown', onKeyDown);
      stopIntent();
    };
  }, []);

  return { Overlay, opening, setOpening };
}
