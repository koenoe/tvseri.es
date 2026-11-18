import { USER_DISPLAY_COOKIE_NAME } from '@/auth/cookies';
import { readDisplayUsername } from '@/auth/displayUsername';
import { expireCookie } from '@/lib/expireCookie';
import { LIBRARY_HINT_KEY, PLEX_HINT_KEY } from '@/lib/viewer/htmlHints';

/** Fired on `window` when this tab changes the display cookie itself (`forgetViewer`). */
const DISPLAY_COOKIE_CHANGE = 'tvseries:display-cookie';

const noop = () => {};

/**
 * Calls `onChange` when the display cookie may have changed: the Cookie Store
 * API reports sign-in and sign-out (also from another tab) where it exists,
 * and this tab's own `forgetViewer` always does. Returns the unsubscribe.
 */
export function subscribeToDisplayCookie(onChange: () => void): () => void {
  if (typeof window === 'undefined') {
    return noop;
  }
  window.addEventListener(DISPLAY_COOKIE_CHANGE, onChange);
  window.cookieStore?.addEventListener('change', onChange);
  return () => {
    window.removeEventListener(DISPLAY_COOKIE_CHANGE, onChange);
    window.cookieStore?.removeEventListener('change', onChange);
  };
}

/** The page's one answer to "signed in?", read once per change */
let signedIn: boolean | undefined;
const watchers = new Set<() => void>();
let stopWatching: (() => void) | null = null;

/**
 * `subscribeToDisplayCookie` shared by every watcher of "signed in?" (a
 * page of tiles asks it hundreds of times): one pair of listeners for the
 * page. The first watcher reads the cookie afresh (it may have changed
 * while nothing watched).
 */
export function subscribeToSignedIn(onChange: () => void): () => void {
  watchers.add(onChange);
  if (!stopWatching) {
    signedIn = undefined;
    stopWatching = subscribeToDisplayCookie(() => {
      signedIn = undefined;
      for (const watcher of watchers) {
        watcher();
      }
    });
  }
  return () => {
    watchers.delete(onChange);
    if (watchers.size === 0) {
      stopWatching?.();
      stopWatching = null;
    }
  };
}

/** Signed in, from the display cookie (`subscribeToSignedIn` keeps it current) */
export const readSignedIn = (): boolean =>
  (signedIn ??= readDisplayUsername(document.cookie) !== null);

/**
 * This browser forgets a viewer the server says no longer exists (a deleted
 * account, `AccountGone`): the display cookie and the stored
 * pre-paint hints go, so the header says Sign in and no placeholder guesses a
 * viewer. The session cookie is HttpOnly: the proxy ends it on the next request, when it
 * finds the display cookie missing and asks `/me`.
 */
export function forgetViewer(): void {
  expireCookie(USER_DISPLAY_COOKIE_NAME);
  try {
    window.localStorage.removeItem(LIBRARY_HINT_KEY);
    window.localStorage.removeItem(PLEX_HINT_KEY);
  } catch {
    // no storage, no hints
  }
  signedIn = undefined;
  window.dispatchEvent(new Event(DISPLAY_COOKIE_CHANGE));
}
