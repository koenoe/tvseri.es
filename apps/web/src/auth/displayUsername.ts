import { USER_DISPLAY_COOKIE_NAME } from './cookies';

/**
 * The username in a `Cookie` string's display cookie (`name`), or null
 * (signed out, empty, or not URL encoding). Self-contained on purpose: the
 * pre-paint script embeds its source (`viewerHintsScript.ts`), so every
 * reader of the cookie reads it the same way. Everything else calls
 * `readDisplayUsername`.
 */
export function readCookieUser(cookie: string, name: string): string | null {
  for (const pair of cookie.split('; ')) {
    if (pair.startsWith(`${name}=`)) {
      try {
        return decodeURIComponent(pair.slice(name.length + 1)) || null;
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * The display cookie's username (`USER_DISPLAY_COOKIE_NAME`) in a `Cookie`
 * string: `document.cookie` in the browser, the request's cookies on the
 * server. Cosmetic: a hint for display and early reads, never an identity.
 */
export function readDisplayUsername(cookie: string): string | null {
  return readCookieUser(cookie, USER_DISPLAY_COOKIE_NAME);
}
