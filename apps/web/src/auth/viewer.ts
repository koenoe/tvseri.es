import 'server-only';

import type { NextRequest } from 'next/server';
import { cache } from 'react';

import isLocalWithoutSecret from './localWithoutSecret';
import {
  checkRequestToken,
  checkToken,
  readRequestSession,
  readRouteSession,
  type VerifiedSubject,
  verifySubject,
} from './requestSession';
import type { SessionState } from './session';

/**
 * The signed-in viewer from the access token alone: id and
 * role come from the verified JWT subject, so callers that only need "who"
 * (marking, library ids, the admin check) skip `GET /me`. Use `auth()` when
 * you need the profile (username, country, services).
 */
export type Viewer = VerifiedSubject & Readonly<{ accessToken: string }>;

type Verify = (accessToken: string) => Promise<VerifiedSubject | null>;

/** Pure: a resolved session to a viewer (tests pass a fake `verify`). */
export async function viewerFromState(
  state: SessionState,
  verify: Verify,
): Promise<Viewer | null> {
  if (state.status !== 'valid' && state.status !== 'refreshed') {
    return null;
  }
  const subject = await verify(state.tokens.accessToken);
  return subject
    ? {
        accessToken: state.tokens.accessToken,
        id: subject.id,
        role: subject.role,
      }
    : null;
}

/**
 * RSC and server actions: read-only (the proxy refreshes), per request; the
 * cookie and the token check are shared with `auth()` (`requestSession.ts`).
 */
const viewerRSC = cache(
  async (): Promise<Viewer | null> =>
    viewerFromState(await readRequestSession(), (accessToken) =>
      verifySubject(accessToken, 'RSC', checkRequestToken),
    ),
);

/** Route handlers: read-only too (`readRouteSession`). */
async function viewerRouteHandler(req: NextRequest): Promise<Viewer | null> {
  return viewerFromState(await readRouteSession(req), (accessToken) =>
    verifySubject(accessToken, 'RouteHandler', checkToken),
  );
}

/**
 * - `getViewer()`: RSC and server actions (reads `cookies()`: inside a
 *   Suspense boundary only).
 * - `getViewer(req)`: route handlers (in the proxy's matcher).
 */
export function getViewer(req?: NextRequest): Promise<Viewer | null> {
  if (isLocalWithoutSecret()) {
    return Promise.resolve(null);
  }
  return req ? viewerRouteHandler(req) : viewerRSC();
}
