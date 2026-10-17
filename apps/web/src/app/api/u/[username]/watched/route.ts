import type { Page, WatchedItem } from '@tvseri.es/schemas';
import type { NextRequest } from 'next/server';

import { findUser, getWatched } from '@/lib/api';
import requireSession from '../../requireSession';

export async function GET(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      username: string;
    }>;
  },
) {
  const { username } = await params;
  const [session, user] = await Promise.all([
    requireSession(),
    findUser({ username }),
  ]);

  if (session instanceof Response) {
    return session;
  }

  if (!user) {
    return Response.json({ error: 'User not found' }, { status: 404 });
  }

  const cursor = req.nextUrl.searchParams.get('cursor') ?? undefined;
  const { items, nextCursor } = await getWatched({
    options: {
      cursor,
    },
    userId: user.id,
  });

  return Response.json({ items, nextCursor } satisfies Page<WatchedItem>);
}
