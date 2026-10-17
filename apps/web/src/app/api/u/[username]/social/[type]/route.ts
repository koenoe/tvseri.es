import type { Page, UserWithFollowInfo } from '@tvseri.es/schemas';
import type { NextRequest } from 'next/server';

import { findUser, getFollowers, getFollowing } from '@/lib/api';
import requireSession from '../../../requireSession';

const types = ['followers', 'following'] as const;

type SocialType = (typeof types)[number];

function isValidType(value: string): value is SocialType {
  return (types as ReadonlyArray<string>).includes(value);
}

export async function GET(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      username: string;
      type: string;
    }>;
  },
) {
  const { type, username } = await params;
  const [session, user] = await Promise.all([
    requireSession(),
    findUser({ username }),
  ]);

  if (session instanceof Response) {
    return session;
  }

  if (!isValidType(type)) {
    return Response.json({ error: 'Invalid type' }, { status: 400 });
  }

  if (!user) {
    return Response.json({ error: 'User not found' }, { status: 404 });
  }

  const payload = {
    accessToken: session.accessToken,
    options: {
      cursor: req.nextUrl.searchParams.get('cursor') ?? '',
    },
    userId: user.id,
  };

  const { items, nextCursor } = await (type === 'following'
    ? getFollowing(payload)
    : getFollowers(payload));

  return Response.json({
    items,
    nextCursor,
  } satisfies Page<UserWithFollowInfo>);
}
