import type { User } from '@tvseri.es/schemas';
import { cacheLife, cacheTag } from 'next/cache';

import { apiFetch } from './client';

/** Tags every cached entry that belongs to one user (e.g. their stats). */
export const userCacheTag = (userId: string) => `user:${userId}`;

/**
 * Tags cached username lookups, including misses, so a rename can drop both
 * the old and the new username.
 */
export const usernameCacheTag = (username: string) => `username:${username}`;

// Not cached across requests (renames would need invalidation); identical
// lookups within one render are deduped by apiFetch.
export async function findUser({ username }: Pick<User, 'username'>) {
  return apiFetch<User>('/user/by-username/:username', {
    notFound: 'null',
    params: {
      username,
    },
  });
}

/**
 * Cached username lookup for the public stats page only. Returns just the
 * public fields it renders, so no private user data ends up in the cache.
 * Invalidated on rename via `usernameCacheTag`.
 */
export async function findPublicUser(username: string) {
  'use cache';
  cacheLife('stats');
  cacheTag(usernameCacheTag(username));
  const user = await findUser({ username });

  if (!user) {
    return null;
  }

  cacheTag(userCacheTag(user.id));

  return { id: user.id, username: user.username };
}
