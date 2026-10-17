'use server';

import { headers } from 'next/headers';
import { redirect, unauthorized } from 'next/navigation';
import isEqual from 'react-fast-compare';
import slugify from 'slugify';
import auth from '@/auth';
import { startLogin, toSafeReturnTo } from '@/auth/login';
import { deleteSession, setUserDisplayCookie } from '@/auth/session';
import { ApiError, follow, unfollow, updateUser } from '@/lib/api';
import { ACTION_OK, type ActionResult, actionError } from './actionResult';
import { cachedUser } from './cached';

/**
 * `returnTo` is the path to return to after logging in. It comes from the
 * client, so it is validated (same-origin paths only) before it is used.
 */
export async function login(returnTo?: string) {
  const { accessToken } = await auth();

  if (accessToken) {
    redirect(toSafeReturnTo(returnTo));
  }

  const headerStore = await headers();
  const host = headerStore.get('host');
  const protocol = host?.includes('localhost') ? 'http' : 'https';
  const url = await startLogin(`${protocol}://${host}`, returnTo);

  redirect(url);
}

export async function logout() {
  await deleteSession();
}

export async function updateProfile(_: unknown, formData: FormData) {
  const { user, accessToken } = await auth();

  if (!user || !accessToken) {
    unauthorized();
  }

  const currentUser = {
    name: user.name ?? '',
    username: user.username ?? '',
  };

  const rawFormData = {
    name: formData.get('name')?.toString() ?? '',
    username: formData.get('username')?.toString() ?? '',
  };

  if (isEqual(currentUser, rawFormData)) {
    return {
      message: 'No changes detected',
      success: false,
    };
  }

  const slugifiedUsername = slugify(rawFormData.username, {
    lower: true,
    strict: true,
  });

  if (slugifiedUsername !== rawFormData.username) {
    return {
      message:
        'Username can only contain lowercase letters, numbers, and dashes',
      success: false,
    };
  }

  try {
    await updateUser({
      accessToken,
      name: rawFormData.name,
      username: slugifiedUsername,
    });
  } catch (error) {
    const message =
      error instanceof ApiError && error.code === 'UsernameAlreadyTaken'
        ? 'Username is already taken'
        : (error as Error).message;
    return {
      message,
      success: false,
    };
  }

  // Keep the header's display-only username in step with the rename.
  if (slugifiedUsername !== currentUser.username) {
    await setUserDisplayCookie(slugifiedUsername);
  }

  return {
    message: 'Profile updated successfully',
    success: true,
  };
}

export async function toggleFollow(
  value: boolean,
  username: string,
): Promise<ActionResult> {
  if (typeof value !== 'boolean' || typeof username !== 'string') {
    return actionError('invalid');
  }

  const [{ user: userFromSession, accessToken }, user] = await Promise.all([
    auth(),
    cachedUser({ username }),
  ]);

  if (!userFromSession || !accessToken) {
    return actionError('unauthenticated');
  }

  if (!user) {
    return actionError('not-found');
  }

  if (user.id === userFromSession.id) {
    return actionError('invalid');
  }

  const payload = {
    accessToken,
    userId: user.id,
  };

  try {
    await (value ? follow(payload) : unfollow(payload));
    return ACTION_OK;
  } catch (error) {
    console.error('[toggleFollow]', error);
    return actionError('failed');
  }
}
