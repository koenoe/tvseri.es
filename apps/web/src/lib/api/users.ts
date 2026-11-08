import type { User } from '@tvseri.es/schemas';
import { pick } from '@tvseri.es/utils';
import { cacheLife, cacheTag } from 'next/cache';
import slugify from 'slugify';

import { apiFetch } from './client';

/**
 * Tags every cached entry that belongs to one user (their stats username
 * lookup and stats). Nothing in the app invalidates it: it's there for manual
 * invalidation (e.g. after deleting or fixing up a user).
 */
export const userCacheTag = (userId: string) => `user:${userId}`;

/**
 * Tags cached username lookups, including misses, so a rename can drop both
 * the old and the new username (`updateProfile` in `app/actions.ts`). Takes
 * the normalised (slugified) username.
 */
export const usernameCacheTag = (username: string) => `username:${username}`;

/**
 * The public profile fields a username lookup returns. Never add private
 * fields (email, role, watch providers, ...).
 */
const PUBLIC_USER_KEYS = ['createdAt', 'id', 'username'] as const;

export type PublicUser = Readonly<
  Pick<User, (typeof PUBLIC_USER_KEYS)[number]>
>;

/**
 * Not cached across requests (user data, and renames would need invalidation
 * everywhere); identical lookups within one render are deduped by apiFetch.
 */
export async function findUser({
  username,
}: Pick<User, 'username'>): Promise<PublicUser | null> {
  const user = await apiFetch<User>('/user/by-username/:username', {
    notFound: 'null',
    params: {
      username,
    },
  });

  return user ? pick(user, PUBLIC_USER_KEYS) : null;
}

/**
 * Normalised like the API's lookup (and `updateProfile`), so every spelling
 * of a username shares one entry and the rename tags match it.
 */
const normalizeUsername = (username: string) =>
  slugify(username, { lower: true, strict: true });

async function fetchCachedPublicUser(normalizedUsername: string) {
  'use cache';
  cacheTag(usernameCacheTag(normalizedUsername));
  const user = await findUser({ username: normalizedUsername });

  if (!user) {
    // A miss is only kept briefly: the username may be taken any moment
    cacheLife('minutes');
    return null;
  }

  cacheLife('stats');
  cacheTag(userCacheTag(user.id));
  return user;
}

/**
 * Cached username lookup for the public stats page only (`stats` profile;
 * misses for minutes). Renames drop both usernames via `usernameCacheTag`.
 */
export const findPublicUser = (username: string) =>
  fetchCachedPublicUser(normalizeUsername(username));

/**
 * The profile header's counts. One request per count, so every header block
 * streams in on its own; each reads a counter (or the user item) in the API.
 */
const PROFILE_COUNTS = {
  episodesWatched: { key: 'count', path: '/user/:id/watched/count' },
  favorites: { key: 'count', path: '/user/:id/list/favorites/count' },
  followers: { key: 'count', path: '/user/:id/followers/count' },
  following: { key: 'count', path: '/user/:id/following/count' },
  seriesFinished: { key: 'count', path: '/user/:id/list/watched/count' },
  /** Minutes */
  totalRuntime: { key: 'runtime', path: '/user/:id/watched/runtime' },
} as const;

export type ProfileCount = keyof typeof PROFILE_COUNTS;

/** Always fresh: the count routes aren't CDN-cached, so a new watch shows */
export async function getProfileCount(
  userId: string,
  count: ProfileCount,
): Promise<number> {
  const { key, path } = PROFILE_COUNTS[count];
  const result = await apiFetch<Readonly<Record<typeof key, number>>>(path, {
    notFound: 'null',
    params: {
      id: userId,
    },
  });

  return result?.[key] ?? 0;
}
