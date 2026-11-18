/**
 * Whether a request to a route handler comes from this site's own pages.
 * Server Actions get Next's Origin-vs-Host check; route handlers don't, so
 * the ones that act for the signed-in viewer call this first and answer 403
 * otherwise (the session cookie is `SameSite=Lax`, so same-site origins such
 * as other subdomains would still carry it).
 *
 * 1. `Sec-Fetch-Site` (every current browser sends it): only `same-origin`,
 *    or `none` (typed in the address bar, a bookmark) for a GET.
 * 2. Without it: an `Origin` header must name the request's own host.
 * 3. Neither header: not a browser fetch (no cookies), allowed; the handler's
 *    own auth check still applies.
 */
export default function isSameOriginRequest(request: Request): boolean {
  const site = request.headers.get('sec-fetch-site');
  if (site) {
    return (
      site === 'same-origin' || (site === 'none' && request.method === 'GET')
    );
  }
  const origin = request.headers.get('origin');
  if (!origin) {
    return true;
  }
  const host =
    request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  try {
    return host !== null && new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** The answer for a request that fails `isSameOriginRequest`. */
export function crossSiteRefused(): Response {
  return Response.json(
    { error: 'Forbidden' },
    { headers: { 'Cache-Control': 'private, no-store' }, status: 403 },
  );
}
