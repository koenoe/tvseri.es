import type { NextRequest } from 'next/server';

import { findUser, getListItems } from '@/lib/api';

const lists = [
  'favorites',
  'in_progress',
  'resuming_soon',
  'watched',
  'watchlist',
] as const;

type List = (typeof lists)[number];

function isValidList(value: string): value is List {
  return (lists as ReadonlyArray<string>).includes(value);
}

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      username: string;
      list: string;
    }>;
  },
) {
  const { list, username } = await params;

  if (!isValidList(list)) {
    return Response.json({ error: 'Invalid list' }, { status: 400 });
  }

  const user = await findUser({ username });

  if (!user) {
    return Response.json({ error: 'User not found' }, { status: 404 });
  }

  const searchParams = request.nextUrl.searchParams;
  const cursorFromSearchParams = searchParams.get('pageOrCursor') ?? '';

  const response = await getListItems({
    listId: list.toUpperCase(),
    options: {
      cursor: cursorFromSearchParams,
    },
    userId: user.id,
  });

  return Response.json({
    items: response.items,
    nextPageOrCursor: response.nextCursor,
  });
}
