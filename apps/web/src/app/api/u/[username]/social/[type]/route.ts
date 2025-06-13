import { type NextRequest } from 'next/server';

import { getFollowers, getFollowing } from '@/lib/db/follow';
import { findUser } from '@/lib/db/user';
import enrichUsersWithFollowInfo from '@/lib/enrichUsersWithFollowInfo';

const types = ['followers', 'following'] as const;

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      username: string;
      type: (typeof types)[number];
    }>;
  },
) {
  const { type, username } = await params;

  if (!types.includes(type)) {
    return Response.json({ error: 'Invalid type' }, { status: 400 });
  }

  const user = await findUser({ username });

  if (!user) {
    return Response.json({ error: 'User not found' }, { status: 404 });
  }

  const searchParams = request.nextUrl.searchParams;
  const cursorFromSearchParams = searchParams.get('cursor') ?? '';
  const payload = {
    userId: user.id,
    options: {
      cursor: cursorFromSearchParams,
    },
  };

  const { items, nextCursor } = await (type === 'following'
    ? getFollowing(payload)
    : getFollowers(payload));

  return Response.json({
    items: await enrichUsersWithFollowInfo(items, {
      username,
      type,
    }),
    nextCursor,
  });
}
