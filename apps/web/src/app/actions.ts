'use server';

import type { Session, User } from '@tvseri.es/schemas';

import { cookies, headers } from 'next/headers';
import { redirect, unauthorized } from 'next/navigation';
import isEqual from 'react-fast-compare';
import slugify from 'slugify';
import { client, setTokens, subjects } from '@/auth';
import { follow, unfollow, updateUser } from '@/lib/api';

import { cachedUser } from './cached';

export async function login() {
  const cookiesStore = await cookies();
  const accessToken = cookiesStore.get('access_token');
  const refreshToken = cookiesStore.get('refresh_token');

  if (accessToken) {
    const verified = await client.verify(subjects, accessToken.value, {
      refresh: refreshToken?.value,
    });
    if (!verified.err && verified.tokens) {
      await setTokens(verified.tokens.access, verified.tokens.refresh);
      redirect('/');
    }
  }

  const headerStore = await headers();
  const host = headerStore.get('host');
  const protocol = host?.includes('localhost') ? 'http' : 'https';
  const { url } = await client.authorize(
    `${protocol}://${host}/api/auth/callback`,
    'code',
  );

  redirect(url);
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('access_token');
  cookieStore.delete('refresh_token');

  redirect('/');
}

export async function updateProfile(_: unknown, formData: FormData) {
  const user = null as User | null;
  const encryptedSessionId = null;

  if (!user || !encryptedSessionId) {
    unauthorized();
  }

  const currentUser = {
    email: user.email ?? '',
    name: user.name ?? '',
    username: user.username ?? '',
  };

  const rawFormData = {
    email: formData.get('email')?.toString() ?? '',
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
      email: rawFormData.email,
      name: rawFormData.name,
      sessionId: encryptedSessionId,
      username: slugifiedUsername,
    });
  } catch (err) {
    const error = err as Error;
    let message = error.message;
    if (error.cause === 'EmailAlreadyTaken') {
      message = 'Email is already taken';
    } else if (error.cause === 'UsernameAlreadyTaken') {
      message = 'Username is already taken';
    }
    return {
      message,
      success: false,
    };
  }

  return {
    message: 'Profile updated successfully',
    success: true,
  };
}

export async function toggleFollow(value: boolean, username: string) {
  const userFromSession = null as User | null;
  const session = null as Session | null;
  const encryptedSessionId = null;

  if (!userFromSession || !session || !encryptedSessionId) {
    return;
  }

  const user = await cachedUser({ username });
  if (!user || user.id === userFromSession.id) {
    return;
  }

  const payload = {
    sessionId: encryptedSessionId,
    userId: user.id,
  };

  if (value) {
    await follow(payload);
  } else {
    await unfollow(payload);
  }
}
