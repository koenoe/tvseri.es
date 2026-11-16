'use server';

import { UpdateUserSchema, UsernameSchema } from '@tvseri.es/schemas';
import { revalidatePath } from 'next/cache';
import * as v from 'valibot';

import auth from '@/auth';
import { setUserDisplayCookie } from '@/auth/sessionCookies';
import { getViewer } from '@/auth/viewer';
import { apiFetch } from '@/lib/api/client';
import { lookupUsernameOwner } from '@/lib/profile/user';
import { revalidateUser } from '@/lib/stats/revalidateUser';
import { failure } from './failure';
import { done, fail, type SettingsActionResult } from './result';

const ProfileInputSchema = v.object({
  name: v.pipe(v.string(), v.maxLength(128)),
  username: v.pipe(v.string(), v.maxLength(128)),
});

/**
 * Is this username free for the signed-in viewer? The lookup answers 404
 * for a free one (`lookupUsernameOwner`, on its own CDN key); the viewer's
 * own username counts as free. Public data, but only a signed-in viewer
 * asks.
 */
export async function checkUsername(
  username: string,
): Promise<SettingsActionResult<'available' | 'taken'>> {
  if (!v.is(UsernameSchema, username)) {
    return fail('invalid');
  }
  const viewer = await getViewer();
  if (!viewer) {
    return fail('unauthenticated');
  }
  try {
    const owner = await lookupUsernameOwner(username);
    return done(owner && owner !== viewer.id ? 'taken' : 'available');
  } catch (error) {
    return failure(error);
  }
}

/**
 * Saves the profile: `PUT /me` with only the fields that differ from what is
 * saved. The username rule (`UsernameSchema`) applies to a username that is
 * changing, never to the saved one. A taken username is `taken` (409). A
 * rename refreshes the header's display cookie and the settings shell.
 */
export async function updateProfile(
  input: Readonly<{ name: string; username: string }>,
): Promise<SettingsActionResult<Readonly<{ name: string; username: string }>>> {
  const parsed = v.safeParse(ProfileInputSchema, input);
  if (!parsed.success) {
    return fail('invalid');
  }
  const { accessToken, user } = await auth();
  if (!user || !accessToken) {
    return fail('unauthenticated');
  }

  const { name, username } = parsed.output;
  const nameChanged = name !== (user.name ?? '');
  const usernameChanged = username !== user.username;
  if (!nameChanged && !usernameChanged) {
    return done({ name, username });
  }

  const body = v.safeParse(UpdateUserSchema, {
    ...(nameChanged && { name }),
    ...(usernameChanged && { username }),
  });
  if (!body.success) {
    return fail('invalid');
  }

  try {
    await apiFetch('/me', { accessToken, body: body.output, method: 'PUT' });
  } catch (error) {
    return failure(error);
  }

  if (usernameChanged) {
    // Keep the header's display-only username in step with the rename.
    await setUserDisplayCookie(username);
    // The old URLs stop working and the new ones must not serve a cached 404.
    revalidateUser(user.id, [user.username, username]);
  }
  revalidatePath('/settings', 'layout');
  return done({ name, username });
}
