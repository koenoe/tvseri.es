import { toSafeReturnTo } from './returnTo';

/**
 * Sign in: the login route (a full navigation, never a client route), coming
 * back to `returnTo` (a same-origin path with its query; anything else is
 * '/', `toSafeReturnTo`) afterwards. No `server-only`: links build it too.
 */
export function loginHref(returnTo: unknown): string {
  return `/api/auth/login?returnTo=${encodeURIComponent(toSafeReturnTo(returnTo))}`;
}

/** `loginHref` back to this page, path and query (browser only) */
export function loginHrefHere(): string {
  return loginHref(`${window.location.pathname}${window.location.search}`);
}

/**
 * For a Sign in link's `onClick`, `onFocus` and `onPointerEnter`: the page's
 * query is only known in the browser (a cached shell, or a component that
 * can't read search params without suspending), so the link's `href` takes
 * it just before it is used.
 */
export function fillLoginHref(
  event: Readonly<{ currentTarget: HTMLAnchorElement }>,
): void {
  event.currentTarget.href = loginHrefHere();
}
