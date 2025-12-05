'use server';

import { headers } from 'next/headers';
import { redirect, unauthorized } from 'next/navigation';
import isEqual from 'react-fast-compare';
import slugify from 'slugify';
import auth from '@/auth';
import { client } from '@/auth/client';
import { deleteSession } from '@/auth/session';
import { follow, unfollow, updateUser } from '@/lib/api';
import { cachedUser } from './cached';

export async function login() {
  const { accessToken } = await auth();

  if (accessToken) {
    redirect('/');
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
  await deleteSession();
}

export async function updateProfile(_: unknown, formData: FormData) {
  const { user, accessToken } = await auth();

  if (!user || !accessToken) {
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
      accessToken,
      email: rawFormData.email,
      name: rawFormData.name,
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
  const { user: userFromSession, accessToken } = await auth();

  if (!userFromSession || !accessToken) {
    return;
  }

  const user = await cachedUser({ username });
  if (!user || user.id === userFromSession.id) {
    return;
  }

  const payload = {
    accessToken,
    userId: user.id,
  };

  if (value) {
    await follow(payload);
  } else {
    await unfollow(payload);
  }
}
