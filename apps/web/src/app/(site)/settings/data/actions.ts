'use server';

import { DeleteAccountSchema } from '@tvseri.es/schemas';
import * as v from 'valibot';

import auth from '@/auth';
import { ApiError, apiFetch } from '@/lib/api/client';
import { expireDeletedUser } from '@/lib/stats/revalidateUser';
import { type AppsActionResult, appsError, appsOk } from '../_lib/appsResult';

/**
 * Delete account. It only ever deletes the signed-in user: the one
 * thing the caller supplies is the typed confirmation, and it must equal the
 * session's own username before the API is called; what the API receives is
 * the session's username, never the typed text.
 *
 * The session cookie is NOT touched here: a cookie change in a server action
 * re-renders the page signed out and would replace the "Account deleted"
 * state. The client ends the session next (`/api/auth/logout`, which also
 * revokes the refresh token). Until then the user's token already answers 401
 * on every API call.
 */
export async function deleteAccount(
  confirm: string,
): Promise<AppsActionResult> {
  const { accessToken, user } = await auth();
  if (!accessToken || !user) {
    return appsError('unauthenticated');
  }
  const parsed = v.safeParse(DeleteAccountSchema, { confirm });
  if (!parsed.success) {
    return appsError('invalid');
  }
  if (parsed.output.confirm.trim() !== user.username) {
    return appsError('mismatch');
  }

  try {
    await apiFetch('/me', {
      accessToken,
      body: { confirm: user.username },
      method: 'DELETE',
    });
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 403) {
        return appsError('not-enabled');
      }
      if (error.status === 400) {
        return appsError('mismatch');
      }
      if (error.status === 401) {
        return appsError('unauthenticated');
      }
    }
    console.error(
      '[deleteAccount]',
      error instanceof ApiError ? error.status : error,
    );
    return appsError('failed');
  }
  // The profile and stats pages go with the account, without re-rendering
  // this page: the "Account deleted" state stays until the person leaves.
  expireDeletedUser(user.id, [user.username]);
  return appsOk(undefined);
}
