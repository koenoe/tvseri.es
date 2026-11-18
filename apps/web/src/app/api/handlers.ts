import { TMDB_ID_PATTERN } from '@tvseri.es/constants';
import 'server-only';

import { unstable_rethrow } from 'next/navigation';
import type { NextRequest } from 'next/server';

import { ACCOUNT_GONE } from '@/auth/accountGone';
import { isAccountGone } from '@/auth/me';
import { getViewer, type Viewer } from '@/auth/viewer';
import { ApiError } from '@/lib/api/client';
import isSameOriginRequest, {
  crossSiteRefused,
} from '@/lib/security/sameOrigin';

/**
 * What the web's route handlers share: the id check, and for the ones that
 * answer for the signed-in viewer (`/api/me/*`, `/api/u/*`, `/api/admin/*`)
 * one adapter, `viewerRoute`, that owns the private header, the 401 and the
 * mapping of a failed API read; `ownPagesRoute` and `adminRoute` narrow it.
 * Public handlers use `CACHE_HEADERS` instead.
 */

/** Per viewer: never kept by the browser or a shared cache */
const PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-store',
} as const;

/** A JSON answer only this viewer's browser sees */
export const privateJson = (body: unknown, status = 200): Response =>
  Response.json(body, { headers: PRIVATE_HEADERS, status });

const TMDB_ID = new RegExp(`^${TMDB_ID_PATTERN}$`);

/** A TMDB id (a show, a person) as a path segment: up to `MAX_TMDB_ID_DIGITS`, no leading zero */
export const isTmdbId = (value: string): boolean => TMDB_ID.test(value);

/**
 * A failed read's answer: the API's `AccountGone` passes through as it is
 * (the browser then forgets the viewer, `forgetViewer`), any other 401 is a
 * 401, everything else a 502.
 */
function failed(error: unknown): Response {
  unstable_rethrow(error);
  if (isAccountGone(error)) {
    return privateJson({ error: ACCOUNT_GONE }, 401);
  }
  if (error instanceof ApiError && error.status === 401) {
    return privateJson({ error: 'Unauthorized' }, 401);
  }
  if (!(error instanceof ApiError)) {
    console.error('[api] route failed', error);
  }
  return privateJson({ error: 'Failed' }, 502);
}

/**
 * A route handler for the signed-in viewer. Verifies the token from the
 * cookie (`getViewer(req)`; the proxy has already answered 401 without a
 * session and refreshed it), answers 401 without one, maps anything the
 * handler throws (`failed`), and makes every answer `private, no-store`.
 * The handler only reads and answers.
 *
 * @example
 * export const GET = viewerRoute(async (viewer) =>
 *   Response.json(await fetchLibraryIds(viewer.accessToken)),
 * );
 */
export function viewerRoute<Context>(
  handler: (
    viewer: Viewer,
    req: NextRequest,
    context: Context,
  ) => Promise<Response>,
): (req: NextRequest, context: Context) => Promise<Response> {
  return async (req, context) => {
    const viewer = await getViewer(req);
    const response = viewer
      ? await handler(viewer, req, context).catch(failed)
      : privateJson({ error: 'Unauthorized' }, 401);
    response.headers.set('Cache-Control', PRIVATE_HEADERS['Cache-Control']);
    return response;
  };
}

type ViewerHandler<Context> = Parameters<typeof viewerRoute<Context>>[0];
type Route<Context> = ReturnType<typeof viewerRoute<Context>>;

/**
 * `viewerRoute` for a read only this site's pages make: another site gets a
 * 403 before the session is read (`isSameOriginRequest`; the session cookie
 * is `SameSite=Lax`, so a sibling subdomain would still send it).
 */
export function ownPagesRoute<Context>(
  handler: ViewerHandler<Context>,
): Route<Context> {
  const route = viewerRoute(handler);
  return (req, context) =>
    isSameOriginRequest(req)
      ? route(req, context)
      : Promise.resolve(crossSiteRefused());
}

/** `ownPagesRoute` for admins only: a signed-in viewer who isn't one gets a 403 */
export function adminRoute<Context>(
  handler: ViewerHandler<Context>,
): Route<Context> {
  return ownPagesRoute((viewer, req, context) =>
    viewer.role === 'admin'
      ? handler(viewer, req, context)
      : Promise.resolve(privateJson({ error: 'Forbidden' }, 403)),
  );
}
