'use server';

import { cookies, headers } from 'next/headers';
import { redirect, unauthorized } from 'next/navigation';
import isEqual from 'react-fast-compare';
import slugify from 'slugify';

import auth from '@/auth';
import { createOTP, validateOTP } from '@/lib/db/otp';
import {
  createSession,
  deleteSession,
  removeTmdbFromSession,
  SESSION_DURATION,
} from '@/lib/db/session';
import {
  createUser,
  findUser,
  removeTmdbFromUser,
  updateUser,
} from '@/lib/db/user';
import { sendEmail } from '@/lib/email';
import {
  createRequestToken,
  deleteAccessToken,
  deleteSessionId,
} from '@/lib/tmdb';
import { encryptToken } from '@/lib/token';
import getBaseUrl from '@/utils/getBaseUrl';

export async function loginWithTmdb(pathname = '/') {
  const cookieStore = await cookies();
  const redirectUri = `${getBaseUrl()}/api/auth/callback/tmdb?redirect=${pathname}`;
  const requestToken = await createRequestToken(redirectUri);
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
  const otp = await createOTP({ email });

  await sendEmail({
    recipient: email,
    sender: 'auth',
    subject: `Your OTP: ${otp}`,
    body: `Your OTP is <strong>${otp}</strong>`,
  });

  const cookieStore = await cookies();
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
  const isValid = await validateOTP({ email, otp });
  if (!isValid) {
    throw new Error('InvalidCode');
  }

  const [headerStore, cookieStore] = await Promise.all([headers(), cookies()]);

  let user = await findUser({ email });
  if (!user) {
    user = await createUser({
      email,
    });
  }

  const sessionId = await createSession({
    userId: user.id,
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
}

export async function logout() {
  const { session } = await auth();
  if (!session) {
    return;
  }

  (await cookies()).delete('sessionId');
  await deleteSession(session.id);

  // Note: delete the session from TMDB
  if (session.tmdbSessionId && session.tmdbAccessToken) {
    await Promise.all([
      deleteAccessToken(session.tmdbAccessToken),
      deleteSessionId(session.tmdbSessionId),
    ]);
  }
}

export async function updateProfile(_: unknown, formData: FormData) {
  const { user } = await auth();

  if (!user) {
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
    trim: true,
  });

  if (slugifiedUsername !== rawFormData.username) {
    return {
      message:
        'Username can only contain lowercase letters, numbers, and dashes',
      success: false,
    };
  }

  try {
    await updateUser(user, {
      email: rawFormData.email,
      name: rawFormData.name,
      username: slugifiedUsername,
    });
  } catch (err) {
    const error = err as Error;
    return {
      message: error.message,
      success: false,
    };
  }

  return {
    message: 'Profile updated successfully',
    success: true,
  };
}

export async function removeTmdbAccount() {
  const { user, session } = await auth();

  if (!user || !session) {
    unauthorized();
  }

  const isTmdbUser =
    user.tmdbAccountId && user.tmdbAccountObjectId && user.tmdbUsername;
  const isTmdbSession = session.tmdbSessionId && session.tmdbAccessToken;

  try {
    if (isTmdbUser) {
      await removeTmdbFromUser(user);
    }

    if (isTmdbSession) {
      await Promise.all([
        removeTmdbFromSession(session),
        deleteAccessToken(session.tmdbAccessToken),
        deleteSessionId(session.tmdbSessionId),
      ]);
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
