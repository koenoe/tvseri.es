'use server';

import { encryptToken } from '@tvseri.es/token';
import { cookies, headers } from 'next/headers';
import { redirect, unauthorized } from 'next/navigation';
import isEqual from 'react-fast-compare';
import slugify from 'slugify';

import auth from '@/auth';
import { SESSION_DURATION } from '@/constants';
import {
  createOTP,
  createTmdbRequestToken,
  authenticateWithOTP,
  follow,
  unfollow,
  unauthenticate,
  unlinkTmdbAccount,
  updateUser,
} from '@/lib/api';
import getBaseUrl from '@/utils/getBaseUrl';

import { cachedUser } from './cached';

export async function loginWithTmdb(pathname = '/') {
  const cookieStore = await cookies();
  const redirectUri = `${getBaseUrl()}/api/auth/callback/tmdb?redirect=${pathname}`;
  const requestToken = await createTmdbRequestToken({ redirectUri });
  const encryptedToken = encryptToken(requestToken);

  cookieStore.set('requestTokenTmdb', encryptedToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 10 * 60, // 10 minutes
  });

  return redirect(
    `https://www.themoviedb.org/auth/access?request_token=${requestToken}`,
  );
}

export async function login(formData: FormData) {
  const honeypotValue = formData.get('verify_email');
  if (honeypotValue) {
    console.error('[LOGIN] Honeypot triggered');
    return;
  }

  const rawFormData = {
    email: formData.get('email'),
    redirectPath: formData.get('redirectPath'),
  };

  if (!rawFormData.email) {
    throw new Error('Email is required');
  }

  const email = rawFormData.email as string;
  const redirectPath = (rawFormData.redirectPath as string) ?? '/';

  const [cookieStore] = await Promise.all([cookies(), createOTP({ email })]);

  const encryptedEmail = encryptToken(email);

  cookieStore.set('emailOTP', encryptedEmail, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 10 * 60, // 10 minutes
  });

  return redirect(
    `/login/otp?redirectPath=${encodeURIComponent(redirectPath)}`,
  );
}

export async function loginWithOTP({
  email,
  otp,
}: Readonly<{
  email: string;
  otp: string;
}>) {
  const [headerStore, cookieStore] = await Promise.all([headers(), cookies()]);
  try {
    const sessionId = await authenticateWithOTP({
      email,
      otp,
      clientIp:
        headerStore.get('cloudfront-viewer-address')?.split(':')?.[0] || '',
      country: headerStore.get('cloudfront-viewer-country') || '',
      city: headerStore.get('cloudfront-viewer-city') || '',
      region: headerStore.get('cloudFront-viewer-country-region') || '',
      userAgent: headerStore.get('user-agent') || '',
    });

    cookieStore.set('sessionId', encryptToken(sessionId), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_DURATION,
    } as const);

    cookieStore.delete('emailOTP');
  } catch (error) {
    console.error('OTP authentication failed:', error);
    throw new Error('InvalidCode');
  }
}

export async function logout() {
  const { session, encryptedSessionId } = await auth();
  if (!session || !encryptedSessionId) {
    return;
  }

  try {
    (await cookies()).delete('sessionId');
    await unauthenticate(encryptedSessionId);
  } catch (error) {
    console.error('Logout failed:', error);
    throw new Error('LogoutFailed');
  }
}

export async function updateProfile(_: unknown, formData: FormData) {
  const { user, encryptedSessionId } = await auth();

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

export async function removeTmdbAccount() {
  const { user, session, encryptedSessionId } = await auth();

  if (!user || !session) {
    unauthorized();
  }

  const isTmdb =
    user.tmdbAccountId &&
    user.tmdbAccountObjectId &&
    user.tmdbUsername &&
    session.tmdbSessionId &&
    session.tmdbAccessToken;

  try {
    if (isTmdb) {
      await unlinkTmdbAccount({
        sessionId: encryptedSessionId,
      });
    }

    return {
      message: 'TMDb removed from your account',
      success: true,
    };
  } catch (err) {
    const error = err as Error;
    return {
      message: error.message,
      success: false,
    };
  }
}

export async function toggleFollow(value: boolean, username: string) {
  const { user: userFromSession, session, encryptedSessionId } = await auth();
  if (!userFromSession || !session || !encryptedSessionId) {
    return;
  }

  const user = await cachedUser({ username });
  if (!user || user.id === userFromSession.id) {
    return;
  }

  const payload = {
    userId: user.id,
    sessionId: encryptedSessionId,
  };

  if (value) {
    await follow(payload);
  } else {
    await unfollow(payload);
  }
}
