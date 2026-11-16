import 'server-only';

/**
 * A redirect that is never cached. A same-site `location` stays relative, so
 * it doesn't depend on which host served the request.
 */
export function redirect(location: string, status: 302 | 303): Response {
  return new Response(null, {
    headers: { 'cache-control': 'no-store', location },
    status,
  });
}

/** The site's “Sign-in broke” page (error code S05E00) */
const SIGN_IN_ERROR_PATH = '/sign-in/error';

/**
 * Where a failed sign-in goes: the error page, keeping the (already
 * validated) return path for its Try again.
 */
export function signInErrorPath(returnTo: string): string {
  return returnTo === '/'
    ? SIGN_IN_ERROR_PATH
    : `${SIGN_IN_ERROR_PATH}?${new URLSearchParams({ returnTo })}`;
}
