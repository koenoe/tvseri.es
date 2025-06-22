import { decryptToken, encryptToken } from '@tvseri.es/token';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';

import auth from '@/auth';
import { SESSION_DURATION } from '@/constants';
import { authenticateWithTmdb, linkTmdbAccount } from '@/lib/api';

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const encryptedRequestToken = cookieStore.get('requestTokenTmdb')?.value;

  if (!encryptedRequestToken) {
    return Response.json(
      { error: 'No approved request token found.' },
      { status: 400 },
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const redirectUri = searchParams.get('redirect') || '/';
  const decryptedRequestToken = decryptToken(encryptedRequestToken);

  // Note: check if we are connecting an authenticated user
  const {
    user: currentUser,
    session: currentSession,
    encryptedSessionId: currentEncryptedSessionId,
  } = await auth();
  if (currentUser && currentSession && currentEncryptedSessionId) {
    try {
      await linkTmdbAccount({
        requestToken: decryptedRequestToken,
        sessionId: currentEncryptedSessionId,
      });
    } catch (error) {
      const [baseUrl, queryString] = redirectUri.split('?');
      const searchParams = new URLSearchParams(queryString);
      if (error instanceof Error && error.message === 'ApiConflictError') {
        searchParams.append('error', 'tmdbAccountAlreadyLinked');
      } else {
        searchParams.append('error', 'unknownError');
      }
      return redirect(`${baseUrl}?${searchParams.toString()}`);
    }

    cookieStore.delete('requestTokenTmdb');
    return redirect(redirectUri);
  }

  const sessionId = await authenticateWithTmdb({
    requestToken: decryptedRequestToken,
    clientIp:
      request.headers.get('cloudfront-viewer-address')?.split(':')?.[0] || '',
    country: request.headers.get('cloudfront-viewer-country') || '',
    city: request.headers.get('cloudfront-viewer-city') || '',
    region: request.headers.get('cloudFront-viewer-country-region') || '',
    userAgent: request.headers.get('user-agent') || '',
  });

  const encryptedSessionId = encryptToken(sessionId);
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_DURATION,
  } as const;

  cookieStore.set('sessionId', encryptedSessionId, cookieOptions);
  cookieStore.delete('requestTokenTmdb');

  return redirect(redirectUri);
}
