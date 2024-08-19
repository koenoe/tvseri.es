import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';

import { createAccessToken, createSessionId } from '@/lib/tmdb';
import { decryptToken, encryptToken } from '@/lib/token';

export async function GET(request: NextRequest) {
  const cookieStore = cookies();
  const encryptedRequestToken = cookieStore.get('requestToken')?.value;

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
  const sessionId = await createSessionId(accessToken);
  const encryptedAccessToken = encryptToken(accessToken);
  const encryptedSessionId = encryptToken(sessionId);
  const encryptedAccountObjectId = encryptToken(accountObjectId);

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 6 * 30 * 24 * 60 * 60, // 6 months in seconds
  } as const;

  cookieStore.set('accessToken', encryptedAccessToken, cookieOptions);
  cookieStore.set('sessionId', encryptedSessionId, cookieOptions);
  cookieStore.set('accountObjectId', encryptedAccountObjectId, cookieOptions);

  cookieStore.delete('requestToken');

  return redirect(redirectUri);
}
