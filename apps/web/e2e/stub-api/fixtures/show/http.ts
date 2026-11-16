import type { IncomingHttpHeaders } from 'node:http';

import type { StubResponse } from '../../types.ts';
import { userState, type VIEWERS, viewerById } from './store.ts';

/** The API's error shape: `{ message, status }`. */
export const fail = (status: number, message: string): StubResponse => ({
  body: { message, status },
  status,
});

export const ok = (body: unknown, status = 200): StubResponse => ({
  body,
  status,
});

type Viewer = (typeof VIEWERS)[keyof typeof VIEWERS];

/**
 * The viewer behind the Bearer token. The auth stub signs the tokens; this
 * only decodes the payload (`properties.id`), a local stand-in for the real
 * API's `verify`, so never point anything real at it.
 */
const viewerOf = (headers: IncomingHttpHeaders): Viewer | null => {
  const token = String(headers.authorization ?? '').split(' ')[1];
  const payload = token?.split('.')[1];
  if (!payload) {
    return null;
  }
  try {
    const decoded: unknown = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    );
    const id =
      typeof decoded === 'object' && decoded !== null && 'properties' in decoded
        ? (decoded.properties as { id?: unknown } | null)?.id
        : undefined;
    return typeof id === 'string' ? (viewerById(id) ?? null) : null;
  } catch {
    return null;
  }
};

/**
 * A Bearer token for someone this fixture doesn't know (another stream's
 * invented viewer): the route passes (`undefined`) so that stream's fixture
 * answers it.
 */
export const isForeignViewer = (headers: IncomingHttpHeaders): boolean =>
  Boolean(headers.authorization) && viewerOf(headers) === null;

/** `requireAuth`: 401 without a (known) token. */
export const requireViewer = (
  headers: IncomingHttpHeaders,
): Viewer | StubResponse => {
  const viewer = viewerOf(headers);
  return viewer ?? fail(401, 'Authentication required');
};

/** `requireIsMe`: the token's own id must be the path's, else 401 (as the API). */
export const requireMe = (
  headers: IncomingHttpHeaders,
  pathId: string,
): Viewer | StubResponse => {
  const viewer = viewerOf(headers);
  if (!viewer) {
    return fail(401, 'Authentication required');
  }
  if (viewer.id !== pathId.toUpperCase()) {
    return fail(401, 'Unauthorized');
  }
  return viewer;
};

/** A route's path id as a user known to the stub (404 otherwise). */
export const userExists = (pathId: string): boolean =>
  userState(pathId) !== undefined;

export const isResponse = (value: unknown): value is StubResponse =>
  typeof value === 'object' &&
  value !== null &&
  'status' in value &&
  !('user' in value);

export const toNumber = (text: string | undefined): number | null =>
  text !== undefined && /^\d+$/.test(text) ? Number(text) : null;

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
