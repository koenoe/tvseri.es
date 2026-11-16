import 'server-only';

import type { Role } from '@tvseri.es/schemas';
import type { NextRequest } from 'next/server';
import { cache } from 'react';

import { SESSION_COOKIE_NAME } from './cookies';
import isLocalWithoutSecret from './localWithoutSecret';
import {
  checkRequestToken,
  checkToken,
  readRequestSession,
  type TokenCheck,
} from './requestSession';
import { resolveSession, type SessionState } from './session';

/**
 * The signed-in viewer from the access token alone: id and
 * role come from the verified JWT subject, so callers that only need "who"
 * (marking, library ids, the admin check) skip `GET /me`. Use `auth()` when
 * you need the profile (username, country, services).
 */
export type Viewer = Readonly<{
  accessToken: string;
  id: string;
  role: Role;
}>;

type Verify = (
  accessToken: string,
) => Promise<Readonly<{ id: string; role: Role }> | null>;

/** The verified subject from a token check (`checkToken` or its per-request copy) */
const subjectFrom =
  (check: (accessToken: string) => Promise<TokenCheck>): Verify =>
  async (accessToken) => {
    const checked = await check(accessToken);
    if (checked.kind === 'unavailable') {
      console.log('[auth] [Viewer] verify unavailable:', checked.error);
      return null;
    }
    const { result } = checked;
    if (result.err || result.subject.type !== 'user') {
      return null;
    }
    return result.subject.properties;
  };

/** Pure: a resolved session to a viewer (tests pass a fake `verify`). */
export async function viewerFromState(
  state: SessionState,
  verify: Verify = subjectFrom(checkToken),
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
    viewerFromState(await readRequestSession(), subjectFrom(checkRequestToken)),
);

/**
 * Route handlers: read-only too; the proxy refreshed before the handler ran
 * and forwarded the new cookie on `req` (see `auth(req)`).
 */
async function viewerRouteHandler(req: NextRequest): Promise<Viewer | null> {
  const state = await resolveSession(
    req.cookies.get(SESSION_COOKIE_NAME)?.value,
    { context: 'RouteHandler', mode: 'read-only' },
  );
  return viewerFromState(state);
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
