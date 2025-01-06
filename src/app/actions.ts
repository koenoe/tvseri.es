'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { deleteSession, findSession } from '@/lib/db/session';
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
  };

  console.log('login:', rawFormData);

  return redirect(`/login/otp?email=${rawFormData.email}`);
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
