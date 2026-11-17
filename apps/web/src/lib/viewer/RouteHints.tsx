'use client';

import { usePathname } from 'next/navigation';
import { useLayoutEffect } from 'react';

import { readDisplayUsername } from '@/auth/displayUsername';

import {
  applyHtmlHints,
  LIBRARY_HINT_KEY,
  LIBRARY_HINT_VERSION,
  PLEX_HINT_KEY,
  PLEX_HINT_VERSION,
  PROMPT_HINT_KEY,
  PROMPT_HINT_VERSION,
} from './htmlHints';

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * The same hints as the root pre-paint script, for client navigations (the
 * script runs once per document): set in a layout effect, so before the new
 * route's first paint. Renders nothing.
 */
export default function RouteHints() {
  const pathname = usePathname();
  useLayoutEffect(() => {
    applyHtmlHints(
      document.documentElement,
      pathname,
      readDisplayUsername(document.cookie),
      storage(),
      new Date().getUTCFullYear(),
      LIBRARY_HINT_KEY,
      LIBRARY_HINT_VERSION,
      PLEX_HINT_KEY,
      PLEX_HINT_VERSION,
      PROMPT_HINT_KEY,
      PROMPT_HINT_VERSION,
    );
  }, [pathname]);
  return null;
}
