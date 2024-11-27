import { cookies } from 'next/headers';
import { type NextRequest } from 'next/server';

import { findSession } from '@/lib/db/session';
import {
  fetchAccountDetails,
  fetchFavorites,
  fetchWatchlist,
} from '@/lib/tmdb';
import { decryptToken } from '@/lib/token';

export async function GET(
  request: NextRequest,
  {
    params: paramsFromProps,
  }: { params: Promise<{ list: 'watchlist' | 'favorites' }> },
) {
  const params = await paramsFromProps;
  const cookieStore = await cookies();
  const encryptedSessionId = cookieStore.get('sessionId')?.value;

  if (!encryptedSessionId) {
    return Response.json(null);
  }

  const decryptedSessionId = decryptToken(encryptedSessionId);
  const session = await findSession(decryptedSessionId);

  if (!session?.tmdbSessionId) {
    return Response.json(null);
  }

  const { id: accountId } = await fetchAccountDetails(session.tmdbSessionId);

  const searchParams = request.nextUrl.searchParams;
  const pageFromSearchParams = searchParams.get('page');
  const page = pageFromSearchParams ? parseInt(pageFromSearchParams, 10) : 1;

  let response;
  if (params.list === 'favorites') {
    response = await fetchFavorites({
      accountId,
      sessionId: session.tmdbSessionId,
      page,
    });
  } else if (params.list === 'watchlist') {
    response = await fetchWatchlist({
      accountId,
      sessionId: session.tmdbSessionId,
      page,
    });
  }

  return Response.json(response?.items ?? []);
}
