'use server';

import { refresh } from 'next/cache';
import * as v from 'valibot';

import { getViewer } from '@/auth/viewer';
import { ApiError, apiFetch } from '@/lib/api/client';

export type FollowResult = Readonly<{ ok: boolean }>;

/** A user id (a ULID; the test fixtures' ids also carry hyphens): one URL segment */
const FollowInputSchema = v.object({
  following: v.boolean(),
  userId: v.pipe(v.string(), v.regex(/^[\w-]{1,64}$/)),
});

/**
 * Follow or unfollow a profile (`POST /user/:id/follow`,
 * `DELETE /user/:id/unfollow`). A server action, so the proxy refreshes the
 * session first and the token never reaches the browser; on success it
 * refreshes the route (`refresh()` from `next/cache`), so the counts follow.
 */
export async function setFollowing(
  userId: string,
  following: boolean,
): Promise<FollowResult> {
  const input = v.safeParse(FollowInputSchema, { following, userId });
  if (!input.success) {
    return { ok: false };
  }
  const viewer = await getViewer();
  if (!viewer || viewer.id === input.output.userId) {
    return { ok: false };
  }
  const follow = input.output.following;
  try {
    await apiFetch(follow ? '/user/:id/follow' : '/user/:id/unfollow', {
      accessToken: viewer.accessToken,
      method: follow ? 'POST' : 'DELETE',
      params: { id: input.output.userId },
    });
    // The sidebar's counts and Follows you are read per request: show them again
    refresh();
    return { ok: true };
  } catch (error) {
    if (error instanceof ApiError) {
      return { ok: false };
    }
    throw error;
  }
}
