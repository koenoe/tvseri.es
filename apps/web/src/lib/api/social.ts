import type { PaginationOptions, UserWithFollowInfo } from '@tvseri.es/schemas';

import { type AuthContext, apiFetch } from './client';

export async function follow({
  userId,
  accessToken,
}: Readonly<{
  userId: string;
}> &
  AuthContext) {
  await apiFetch('/user/:id/follow', {
    auth: {
      token: accessToken,
      type: 'Bearer',
    },
    method: 'POST',
    params: {
      id: userId,
    },
  });
}

export async function unfollow({
  userId,
  accessToken,
}: Parameters<typeof follow>[0]) {
  await apiFetch('/user/:id/unfollow', {
    auth: {
      token: accessToken,
      type: 'Bearer',
    },
    method: 'DELETE',
    params: {
      id: userId,
    },
  });
}

export async function getFollowerCount(userId: string) {
  const result = (await apiFetch('/user/:id/followers/count', {
    params: {
      id: userId,
    },
  })) as Readonly<{
    count: number;
  }>;

  return result.count;
}

export async function getFollowingCount(userId: string) {
  const result = (await apiFetch('/user/:id/following/count', {
    params: {
      id: userId,
    },
  })) as Readonly<{
    count: number;
  }>;

  return result.count;
}

export async function getFollowers(
  input: Readonly<{
    userId: string;
    options?: Omit<PaginationOptions, 'sortBy'>;
  }> &
    AuthContext,
) {
  const result = (await apiFetch('/user/:id/followers', {
    auth: {
      token: input.accessToken,
      type: 'Bearer',
    },
    params: {
      id: input.userId,
    },
    query: {
      cursor: input.options?.cursor,
      limit: input.options?.limit,
      sort_direction: input.options?.sortDirection,
    },
  })) as Readonly<{
    items: UserWithFollowInfo[];
    nextCursor: string | null;
  }>;

  return result;
}

export async function getFollowing(input: Parameters<typeof getFollowers>[0]) {
  const result = (await apiFetch('/user/:id/following', {
    auth: {
      token: input.accessToken,
      type: 'Bearer',
    },
    params: {
      id: input.userId,
    },
    query: {
      cursor: input.options?.cursor,
      limit: input.options?.limit,
      sort_direction: input.options?.sortDirection,
    },
  })) as Readonly<{
    items: UserWithFollowInfo[];
    nextCursor: string | null;
  }>;

  return result;
}

export async function isFollowing({
  userId,
  targetUserId,
}: Readonly<{
  userId: string;
  targetUserId: string;
}>) {
  const result = (await apiFetch('/user/:id/following/:target', {
    params: {
      id: userId,
      target: targetUserId,
    },
  })) as Readonly<{
    value: boolean;
  }>;

  return result.value;
}

export async function isFollower({
  userId,
  targetUserId,
}: Readonly<{
  userId: string;
  targetUserId: string;
}>) {
  const result = (await apiFetch('/user/:id/followers/:target', {
    params: {
      id: userId,
      target: targetUserId,
    },
  })) as Readonly<{
    value: boolean;
  }>;

  return result.value;
}
