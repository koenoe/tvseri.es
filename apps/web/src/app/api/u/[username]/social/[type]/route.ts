import { type NextRequest } from 'next/server';

import auth from '@/auth';
import { findUser, getFollowers, getFollowing } from '@/lib/api';

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

  const { encryptedSessionId } = await auth();
  const searchParams = request.nextUrl.searchParams;
  const cursorFromSearchParams = searchParams.get('cursor') ?? '';
  const payload = {
    userId: user.id,
    sessionId: encryptedSessionId ?? undefined,
    options: {
      cursor: cursorFromSearchParams,
    },
  };

  const { items, nextCursor } = await (type === 'following'
    ? getFollowing(payload)
    : getFollowers(payload));

  return Response.json({
    items,
    nextCursor,
  });
}
