'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import {
  createRequestToken,
  deleteAccessToken,
  deleteSessionId,
} from '@/lib/tmdb';
import { decryptToken, encryptToken } from '@/lib/token';
import getBaseUrl from '@/utils/getBaseUrl';

export async function login(pathname = '/') {
  const redirectUri = `${getBaseUrl()}/api/auth/callback?redirect=${pathname}`;
  const requestToken = await createRequestToken(redirectUri);
  const encryptedToken = encryptToken(requestToken);

  cookies().set('requestToken', encryptedToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 10 * 60, // 10 minutes
  });

  return redirect(
    `https://www.themoviedb.org/auth/access?request_token=${requestToken}`,
  );
}

export async function logout() {
  const cookieStore = cookies();
  const encryptedSessionId = cookieStore.get('sessionId')?.value;
  const encryptedAccessToken = cookieStore.get('accessToken')?.value;

  cookieStore.delete('accessToken');
  cookieStore.delete('accountObjectId');
  cookieStore.delete('sessionId');

  if (encryptedSessionId) {
    const decryptedSessionId = decryptToken(encryptedSessionId);
    await deleteSessionId(decryptedSessionId);
  }

  if (encryptedAccessToken) {
    const decryptedAccessToken = decryptToken(encryptedAccessToken);
    await deleteAccessToken(decryptedAccessToken);
  }
}
