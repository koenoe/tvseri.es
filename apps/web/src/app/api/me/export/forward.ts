import 'server-only';

import type { NextRequest } from 'next/server';

import type { Viewer } from '@/auth/viewer';
import { ApiError, apiResponse, errorCode } from '@/lib/api/client';
import isSameOriginRequest, {
  crossSiteRefused,
} from '@/lib/security/sameOrigin';

import { privateJson, viewerRoute } from '../../handlers';

/** Exports are up to 5.5 MB: more than the API client's default timeout allows for. */
const EXPORT_TIMEOUT_MS = 30_000;

const FALLBACK_TYPE: Readonly<Record<ExportFile, string>> = {
  'everything.json': 'application/json; charset=utf-8',
  'history.csv': 'text/csv; charset=utf-8',
};

export type ExportFile = 'everything.json' | 'history.csv';

/**
 * `GET /me/export/<file>` for the signed-in viewer, streamed to the browser
 * with the API's own attachment name. The browser can't hold the API key, so
 * this is the only way to it. The proxy answers 401 signed out; this checks
 * again (`viewerRoute`) and never forwards anything but the viewer's own
 * token. Streamed, so through `apiResponse` (`apiFetch` reads the whole body).
 *
 * - 403: asked for from another site (before the session is read)
 * - 401: not signed in, or the API refused the token (`AccountGone` passes
 *   through)
 * - 413: too big to download in one go (the API's 5.5 MB cap)
 * - 502: anything else went wrong upstream
 */
export function forwardExport(
  req: NextRequest,
  file: ExportFile,
): Promise<Response> {
  if (!isSameOriginRequest(req)) {
    return Promise.resolve(crossSiteRefused());
  }
  return viewerRoute((viewer) => forward(viewer, file))(req, undefined);
}

async function forward(viewer: Viewer, file: ExportFile): Promise<Response> {
  const upstream = await apiResponse('/me/export/:file', {
    accessToken: viewer.accessToken,
    cache: 'no-store',
    params: { file },
    timeoutMs: EXPORT_TIMEOUT_MS,
  });
  if (upstream.status === 413) {
    return privateJson({ error: 'TooLarge' }, 413);
  }
  if (!upstream.ok || !upstream.body) {
    const body: unknown = await upstream.json().catch(() => null);
    throw new ApiError(upstream.status, errorCode(body));
  }
  return new Response(upstream.body, {
    headers: {
      'Content-Disposition':
        upstream.headers.get('content-disposition') ??
        `attachment; filename="tvseries-${file}"`,
      'Content-Type':
        upstream.headers.get('content-type') ?? FALLBACK_TYPE[file],
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
