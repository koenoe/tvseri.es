import { type NextRequest } from 'next/server';

import { findUser, getListItems } from '@/lib/api';

const lists = ['favorites', 'in_progress', 'watched', 'watchlist'] as const;

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      username: string;
      list: (typeof lists)[number];
    }>;
  },
) {
  const { list, username } = await params;

  if (!lists.includes(list)) {
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
