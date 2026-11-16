/**
 * The username in a `document.cookie` string's display cookie (`name`), or
 * null (signed out, empty, or not URL encoding). Self-contained on purpose:
 * the pre-paint script embeds its source, so every hint reads the cookie
 * once, the same way the header does (`readDisplayUsername`).
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
