const DUMMY_ORIGIN = 'http://localhost';

/**
 * Returns `value` when it is a same-origin relative path, otherwise '/'.
 * Resolving it with the URL parser (which, like browsers, ignores tabs and
 * newlines and treats `\` as `/`) catches `//evil.com`, `/\evil.com` and
 * similar open-redirect tricks.
 */
export function toSafeReturnTo(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/')) {
    return '/';
  }

  try {
    const url = new URL(value, DUMMY_ORIGIN);
    if (
      url.origin !== DUMMY_ORIGIN ||
      // A normalised `/./\/evil.com` is `//evil.com`, which is protocol-relative.
      url.pathname.startsWith('//')
    ) {
      return '/';
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/';
  }
}
