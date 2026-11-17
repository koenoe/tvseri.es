'use server';

import { DeleteAccountSchema } from '@tvseri.es/schemas';
import * as v from 'valibot';

import auth from '@/auth';
import { apiFailure } from '@/lib/actions/apiFailure';
import {
  type ActionError,
  type ActionResult,
  actionError,
  okResult,
} from '@/lib/actions/result';
import { apiFetch } from '@/lib/api/client';
import { expireDeletedUser } from '@/lib/stats/revalidateUser';

/**
 * `mismatch`: a typed username that isn't the signed-in user's (or the API's
 * 400 for it). A 404 is a plain failure here.
 */
export type DeleteAccountError = ActionError | 'mismatch';

const STATUSES = {
  400: 'mismatch',
  404: 'failed',
} as const;

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
): Promise<ActionResult<undefined, DeleteAccountError>> {
  const { accessToken, user } = await auth();
  if (!accessToken || !user) {
    return actionError('unauthenticated');
  }
  const parsed = v.safeParse(DeleteAccountSchema, { confirm });
  if (!parsed.success) {
    return actionError('invalid');
  }
  if (parsed.output.confirm.trim() !== user.username) {
    return actionError('mismatch');
  }

  try {
    await apiFetch('/me', {
      accessToken,
      body: { confirm: user.username },
      method: 'DELETE',
    });
  } catch (error) {
    return apiFailure('deleteAccount', error, STATUSES);
  }
  // The profile and stats pages go with the account, without re-rendering
  // this page: the "Account deleted" state stays until the person leaves.
  expireDeletedUser(user.id, [user.username]);
  return okResult(undefined);
}
