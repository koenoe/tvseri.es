import type { NextRequest } from 'next/server';

import { findUser, getWatched } from '@/lib/api';

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
  const user = await findUser({ username });

  if (!user) {
    return Response.json({ error: 'User not found' }, { status: 404 });
  }

  const searchParams = req.nextUrl.searchParams;
  const cursor = searchParams.get('cursor') ?? undefined;

  const { items, nextCursor } = await getWatched({
    options: {
      cursor,
    },
    userId: user.id,
  });

  return Response.json({
    items,
    nextCursor,
  });
}
