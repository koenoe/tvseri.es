import { type ListItem, type Page, parseListIdParam } from '@tvseri.es/schemas';
import type { NextRequest } from 'next/server';

import { findUser, getListItems } from '@/lib/api';
import requireSession from '../../../requireSession';

export async function GET(
  req: NextRequest,
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
  const [session, user] = await Promise.all([
    requireSession(),
    findUser({ username }),
  ]);

  if (session instanceof Response) {
    return session;
  }

  const listId = parseListIdParam(list);

  if (!listId) {
    return Response.json({ error: 'Invalid list' }, { status: 400 });
  }

  if (!user) {
    return Response.json({ error: 'User not found' }, { status: 404 });
  }

  const { items, nextCursor } = await getListItems({
    listId,
    options: {
      cursor: req.nextUrl.searchParams.get('cursor') ?? '',
    },
    userId: user.id,
  });

  return Response.json({ items, nextCursor } satisfies Page<ListItem>);
}
