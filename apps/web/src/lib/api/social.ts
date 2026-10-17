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
    accessToken,
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
    accessToken,
    method: 'DELETE',
    params: {
      id: userId,
    },
  });
}

export async function getFollowerCount(userId: string) {
  const result = await apiFetch<
    Readonly<{
      count: number;
    }>
  >('/user/:id/followers/count', {
    notFound: 'null',
    params: {
      id: userId,
    },
  });

  return result?.count ?? 0;
}

export async function getFollowingCount(userId: string) {
  const result = await apiFetch<
    Readonly<{
      count: number;
    }>
  >('/user/:id/following/count', {
    notFound: 'null',
    params: {
      id: userId,
    },
  });

  return result?.count ?? 0;
}

export async function getFollowers(
  input: Readonly<{
    userId: string;
    options?: Omit<PaginationOptions, 'sortBy'>;
  }> &
    AuthContext,
) {
  const result = await apiFetch<
    Readonly<{
      items: UserWithFollowInfo[];
      nextCursor: string | null;
    }>
  >('/user/:id/followers', {
    accessToken: input.accessToken,
    notFound: 'null',
    params: {
      id: input.userId,
    },
    query: {
      cursor: input.options?.cursor,
      limit: input.options?.limit,
      sort_direction: input.options?.sortDirection,
    },
  });

  return result ?? { items: [], nextCursor: null };
}

export async function getFollowing(input: Parameters<typeof getFollowers>[0]) {
  const result = await apiFetch<
    Readonly<{
      items: UserWithFollowInfo[];
      nextCursor: string | null;
    }>
  >('/user/:id/following', {
    accessToken: input.accessToken,
    notFound: 'null',
    params: {
      id: input.userId,
    },
    query: {
      cursor: input.options?.cursor,
      limit: input.options?.limit,
      sort_direction: input.options?.sortDirection,
    },
  });

  return result ?? { items: [], nextCursor: null };
}

export async function isFollowing({
  userId,
  targetUserId,
}: Readonly<{
  userId: string;
  targetUserId: string;
}>) {
  const result = await apiFetch<
    Readonly<{
      value: boolean;
    }>
  >('/user/:id/following/:target', {
    notFound: 'null',
    params: {
      id: userId,
      target: targetUserId,
    },
  });

  return result?.value ?? false;
}
