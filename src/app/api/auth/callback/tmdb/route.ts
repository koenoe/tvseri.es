import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';

import { createSession, SESSION_DURATION } from '@/lib/db/session';
import { createUser, findUser } from '@/lib/db/user';
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
  if (!user) {
    user = await createUser({
      name: tmdbAccount.name,
      username: tmdbAccount.username,
      tmdbAccountId: tmdbAccount.id,
      tmdbAccountObjectId: accountObjectId,
    });
  }

  const sessionId = await createSession({
    userId: user.id,
    clientIp: request.headers.get('cloudfront-viewer-address') || '',
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
