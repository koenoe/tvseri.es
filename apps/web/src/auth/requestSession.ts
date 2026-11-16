import 'server-only';

import { subjects } from '@tvseri.es/schemas';
import { cookies } from 'next/headers';
import { cache } from 'react';

import { getAuthClient } from './client';
import { SESSION_COOKIE_NAME } from './cookies';
import { resolveSession, type SessionState } from './session';

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

/** The auth server's verdict on an access token, or why there is none */
export type TokenCheck = Readonly<
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
    return { error, kind: 'unavailable' };
  }
}

/** `checkToken`, once per token per RSC request or server action. */
export const checkRequestToken = cache(checkToken);
