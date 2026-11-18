import { useSyncExternalStore } from 'react';

import { readDisplayUsername } from '@/auth/displayUsername';

import { subscribeToDisplayCookie } from './displayCookie';

const getSnapshot = () => readDisplayUsername(document.cookie);

// Unknown on the server and during hydration, so the prerendered (cached)
// header is the same for everyone and needs no per-request render.
const getServerSnapshot = () => undefined;

/**
 * The signed-in username for display, from the display-only cookie
 * (`USER_DISPLAY_COOKIE_NAME`): `undefined` until hydrated, then the username
 * or `null` when signed out. Cosmetic only; the server authorises every
 * request with the session cookie.
 */
export default function useMenuUsername(): string | null | undefined {
  return useSyncExternalStore<string | null | undefined>(
    subscribeToDisplayCookie,
    getSnapshot,
    getServerSnapshot,
  );
}
