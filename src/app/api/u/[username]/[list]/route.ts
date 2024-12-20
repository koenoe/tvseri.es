import { type NextRequest } from 'next/server';

import { getListItems } from '@/lib/db/list';
import { findUser } from '@/lib/db/user';

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      username: string;
      list: 'watchlist' | 'favorites' | 'watched';
    }>;
  },
) {
  const { list, username } = await params;

  if (!['watchlist', 'favorites', 'watched'].includes(list)) {
    return Response.json({ error: 'Invalid list' }, { status: 400 });
  }

  const user = await findUser({ username });

  if (!user) {
    return Response.json({ error: 'User not found' }, { status: 404 });
  }

  const searchParams = request.nextUrl.searchParams;
  const cursorFromSearchParams = searchParams.get('pageOrCursor') ?? '';

  const response = await getListItems({
    userId: user.id,
    listId: list.toUpperCase(),
    options: {
      cursor: cursorFromSearchParams,
    },
  });

  return Response.json({
    items: response.items,
    nextPageOrCursor: response.nextCursor,
  });
}
