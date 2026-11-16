import 'server-only';

import { type User, UserSchema } from '@tvseri.es/schemas';

import { ApiError, apiFetch } from '@/lib/api/client';

import { ACCOUNT_GONE } from './accountGone';

/**
 * The signed-in user (`GET /me`), validated with the shared `UserSchema`, or
 * null when the API doesn't know the token's user. Throws `ApiError` when the
 * API fails.
 */
export function fetchMe(accessToken: string): Promise<User | null> {
  return apiFetch('/me', {
    accessToken,
    notFound: 'null',
    schema: UserSchema,
  });
}

/**
 * - `user`: the token's user.
 * - `gone`: the API says the token's user no longer exists (deleted, or being
 *   deleted: its `AccountGone` 401). The session can never work again.
 * - `unknown`: anything else (timeout, 5xx, a 401 for a token the API couldn't
 *   verify, an unexpected answer). Never a reason to end a session: it may be
 *   an outage.
 */
export type UserCheck = Readonly<
  { kind: 'user'; user: User } | { kind: 'gone' } | { kind: 'unknown' }
>;

export const isAccountGone = (error: unknown): boolean =>
  error instanceof ApiError &&
  error.status === 401 &&
  error.code === ACCOUNT_GONE;

/** `GET /me`, sorted into what a session can act on (see `UserCheck`). */
export async function checkUser(accessToken: string): Promise<UserCheck> {
  try {
    const user = await fetchMe(accessToken);
    return user ? { kind: 'user', user } : { kind: 'unknown' };
  } catch (error) {
    return isAccountGone(error) ? { kind: 'gone' } : { kind: 'unknown' };
  }
}
