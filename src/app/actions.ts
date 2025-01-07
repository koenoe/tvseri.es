'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { createOTP, validateOTP } from '@/lib/db/otp';
import {
  createSession,
  deleteSession,
  findSession,
  SESSION_DURATION,
} from '@/lib/db/session';
import { createUser, findUser } from '@/lib/db/user';
import { sendEmail } from '@/lib/email';
import {
  createRequestToken,
  deleteAccessToken,
  deleteSessionId,
} from '@/lib/tmdb';
import { decryptToken, encryptToken } from '@/lib/token';
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
    subject: `tvseri.es OTP: ${otp}`,
    body: `Your OTP is <strong>${otp}</strong>`,
  });

  return redirect(
    `/login/otp?email=${email}&redirectPath=${encodeURIComponent(redirectPath)}`,
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
    throw new Error('Invalid code');
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
}

export async function logout() {
  const cookieStore = await cookies();
  const encryptedSessionId = cookieStore.get('sessionId')?.value;

  if (!encryptedSessionId) {
    return;
  }

  const decryptedSessionId = decryptToken(encryptedSessionId);
  const session = await findSession(decryptedSessionId);

  if (!session) {
    return;
  }

  cookieStore.delete('sessionId');
  await deleteSession(session.id);

  // Note: delete the session from TMDB
  if (session.tmdbSessionId && session.tmdbAccessToken) {
    await Promise.all([
      deleteAccessToken(session.tmdbAccessToken),
      deleteSessionId(session.tmdbSessionId),
    ]);
  }
}
