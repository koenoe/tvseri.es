import 'server-only';

import { type Role, subjects } from '@tvseri.es/schemas';
import { cookies } from 'next/headers';
import { unstable_rethrow } from 'next/navigation';
import type { NextRequest } from 'next/server';
import { cache } from 'react';

import { getAuthClient } from './client';
import { SESSION_COOKIE_NAME } from './cookies';
import {
  resolveSession,
  type SessionContext,
  type SessionState,
} from './session';

/**
 * The session cookie of this RSC request or server action, decrypted once
 * however many callers ask (`auth()` and `getViewer()` both). Read-only: it
 * never refreshes, the proxy does (OpenAuth rotates refresh tokens and RSC
 * can't write the new cookie).
 */
export const readRequestSession = cache(async (): Promise<SessionState> => {
  const cookieStore = await cookies();
  return resolveSession(cookieStore.get(SESSION_COOKIE_NAME)?.value, {
    context: 'RSC',
    mode: 'read-only',
  });
});

/**
 * The session cookie on a route handler's request. Read-only too: the proxy
 * runs before every route handler that reads the session (its matcher;
 * `proxyMatcher.test.ts` checks them all), refreshes there and forwards the
 * new cookie on the request, so the token in `req` is fresh. One refresher
 * per request keeps rotation simple: a second refresh here would only race
 * the proxy's.
 */
export function readRouteSession(req: NextRequest): Promise<SessionState> {
  return resolveSession(req.cookies.get(SESSION_COOKIE_NAME)?.value, {
    context: 'RouteHandler',
    mode: 'read-only',
  });
}

/** The auth server's verdict on an access token, or why there is none */
type TokenCheck = Readonly<
  | { kind: 'verified'; result: Awaited<ReturnType<typeof verify>> }
  | { kind: 'unavailable'; error: unknown }
>;

const verify = (accessToken: string) =>
  getAuthClient().verify(subjects, accessToken);

/** Verifies an access token; a throw (keys unreachable) comes back as `unavailable`. */
export async function checkToken(accessToken: string): Promise<TokenCheck> {
  try {
    return { kind: 'verified', result: await verify(accessToken) };
  } catch (error) {
    // a completed prerender's abandoned fetch is Next's, not the keys failing
    unstable_rethrow(error);
    return { error, kind: 'unavailable' };
  }
}

/** `checkToken`, once per token per RSC request or server action. */
export const checkRequestToken = cache(checkToken);

export type TokenChecker = (accessToken: string) => Promise<TokenCheck>;

/** Who a verified access token belongs to: the JWT's user subject */
export type VerifiedSubject = Readonly<{ id: string; role: Role }>;

/**
 * The user subject of an access token, or null when it doesn't verify (or
 * the auth server's keys can't be reached). `check` is `checkRequestToken`
 * in RSC, so `auth()` and `getViewer()` share one verification per request.
 */
export async function verifySubject(
  accessToken: string,
  context: SessionContext,
  check: TokenChecker,
): Promise<VerifiedSubject | null> {
  const checked = await check(accessToken);
  if (checked.kind === 'unavailable') {
    console.log(`[auth] [${context}] verify unavailable:`, checked.error);
    return null;
  }
  const { result } = checked;
  if (result.err) {
    console.log(`[auth] [${context}] verify failed:`, result.err);
    return null;
  }
  return result.subject.type === 'user' ? result.subject.properties : null;
}
