import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';

import auth from '@/auth';
import {
  addTmdbToSession,
  createSession,
  SESSION_DURATION,
} from '@/lib/db/session';
import { addTmdbToUser, createUser, findUser } from '@/lib/db/user';
import {
  createAccessToken,
  createSessionId,
  fetchAccountDetails,
} from '@/lib/tmdb';
import { decryptToken, encryptToken } from '@/lib/token';

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
  const { accessToken, accountObjectId } = await createAccessToken(
    decryptedRequestToken,
  );
  const tmdbSessionId = await createSessionId(accessToken);
  const tmdbAccount = await fetchAccountDetails(tmdbSessionId);

  let user = await findUser({ tmdbAccountId: tmdbAccount.id });

  // Note: check if we are connecting an authenticated user
  const { user: currentUser, session: currentSession } = await auth();
  if (currentUser && currentSession) {
    if (user) {
      const [baseUrl, queryString] = redirectUri.split('?');
      const searchParams = new URLSearchParams(queryString);
      searchParams.append('error', 'tmdbAccountAlreadyLinked');
      return redirect(`${baseUrl}?${searchParams.toString()}`);
    }

    await Promise.all([
      addTmdbToSession(currentSession, {
        tmdbSessionId,
        tmdbAccessToken: accessToken,
      }),
      addTmdbToUser(currentUser, {
        tmdbAccountId: tmdbAccount.id,
        tmdbAccountObjectId: accountObjectId,
        tmdbUsername: tmdbAccount.username,
      }),
    ]);
    cookieStore.delete('requestTokenTmdb');
    return redirect(redirectUri);
  }

  if (!user) {
    user = await createUser({
      name: tmdbAccount.name,
      username: tmdbAccount.username,
      tmdbAccountId: tmdbAccount.id,
      tmdbAccountObjectId: accountObjectId,
    });
  }

  const country = request.headers.get('cloudfront-viewer-country') || '';
  const city = request.headers.get('cloudfront-viewer-city') || '';
  const region = request.headers.get('cloudFront-viewer-country-region') || '';
  const sessionId = await createSession({
    userId: user.id,
    clientIp:
      request.headers.get('cloudfront-viewer-address')?.split(':')?.[0] || '',
    country,
    city,
    region,
    userAgent: request.headers.get('user-agent') || '',
    tmdbSessionId,
    tmdbAccessToken: accessToken,
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
