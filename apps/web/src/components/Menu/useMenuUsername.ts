import { useSyncExternalStore } from 'react';

import { USER_DISPLAY_COOKIE_NAME } from '@/constants';

const COOKIE_PREFIX = `${USER_DISPLAY_COOKIE_NAME}=`;

const noop = () => {};

// The Cookie Store API reports cookie changes (e.g. a rename in another tab).
// Without it, the cookie is still re-read on every render, and the menu
// remounts after login/logout.
function subscribe(onChange: () => void) {
  if (!window.cookieStore) {
    return noop;
  }
  window.cookieStore.addEventListener('change', onChange);
  return () => window.cookieStore.removeEventListener('change', onChange);
}

function getSnapshot(): string | null {
  const cookie = document.cookie
    .split('; ')
    .find((pair) => pair.startsWith(COOKIE_PREFIX));

  if (!cookie) {
    return null;
  }

  try {
    return decodeURIComponent(cookie.slice(COOKIE_PREFIX.length)) || null;
  } catch {
    return null;
  }
}

// Unknown on the server and during hydration, so the prerendered (cached)
// header is the same for everyone and needs no per-request render.
function getServerSnapshot(): undefined {
  return undefined;
}

/**
 * The logged-in username for display, from the display-only cookie (see
 * `USER_DISPLAY_COOKIE_NAME`): `undefined` until hydrated, then the username
 * or `null` when logged out. Cosmetic only; the server authorises every
 * request with the session cookie.
 */
export default function useMenuUsername(): string | null | undefined {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
