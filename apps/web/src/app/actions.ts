'use server';

import {
  SCROBBLE_PROVIDERS,
  type ScrobbleProvider,
} from '@tvseri.es/constants';
import { updateTag } from 'next/cache';
import { headers } from 'next/headers';
import { redirect, unauthorized } from 'next/navigation';
import isEqual from 'react-fast-compare';
import slugify from 'slugify';
import auth from '@/auth';
import { startLogin, toSafeReturnTo } from '@/auth/login';
import { deleteSession, setUserDisplayCookie } from '@/auth/session';
import {
  ApiError,
  createWebhookToken,
  findUser,
  follow,
  unfollow,
  updateUser,
  usernameCacheTag,
} from '@/lib/api';
import {
  ACTION_OK,
  type ActionError,
  type ActionResult,
  actionError,
} from './actionResult';

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

  if (slugifiedUsername !== currentUser.username) {
    // Keep the header's display-only username in step with the rename.
    await setUserDisplayCookie(slugifiedUsername);
    // The public stats pages are cached per URL: drop the old username's
    // entries (so they 404) and any cached miss for the new one.
    if (currentUser.username) {
      updateTag(usernameCacheTag(currentUser.username));
    }
    updateTag(usernameCacheTag(slugifiedUsername));
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
    findUser({ username }),
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

export type WebhookTokenResult = Readonly<
  { ok: true; token: string } | { ok: false; error: ActionError }
>;

const isScrobbleProvider = (value: unknown): value is ScrobbleProvider =>
  SCROBBLE_PROVIDERS.some((provider) => provider === value);

/** Generates (or regenerates) the user's webhook token for a provider */
export async function generateWebhookToken(
  type: ScrobbleProvider,
): Promise<WebhookTokenResult> {
  if (!isScrobbleProvider(type)) {
    return { error: 'invalid', ok: false };
  }

  const { accessToken } = await auth();
  if (!accessToken) {
    return { error: 'unauthenticated', ok: false };
  }

  try {
    const token = await createWebhookToken({ accessToken, type });
    return { ok: true, token };
  } catch (error) {
    console.error('[generateWebhookToken]', error);
    return { error: 'failed', ok: false };
  }
}
