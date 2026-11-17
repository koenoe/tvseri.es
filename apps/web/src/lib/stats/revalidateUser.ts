import 'server-only';

import { revalidateTag, updateTag } from 'next/cache';

import { tags } from '@/lib/cache/tags';

/**
 * Call from a server action after a user's public identity changed: a
 * rename (pass the old and the new username) or a delete-account request.
 * Expires the user's cached lookup, profile reads and Stats pages and cards
 * (`user:`, `username:`, `stats:`), so the next visit renders fresh (a
 * deleted user's Stats page becomes the 404). CDN copies of the share card
 * live out their own Cache-Control (a day, plus a day stale at most).
 *
 * Server actions only (`updateTag`); a route handler or a queue callback
 * would use `revalidateTag(tag, 'max')` for the same tags.
 */
const userTags = (
  userId: string,
  usernames: ReadonlyArray<string>,
): ReadonlyArray<string> => [
  tags.user(userId),
  tags.stats(userId),
  ...usernames.map(tags.username),
];

export function revalidateUser(
  userId: string,
  usernames: ReadonlyArray<string>,
): void {
  for (const tag of userTags(userId, usernames)) {
    updateTag(tag);
  }
}

/**
 * The same tags after a delete-account request, without re-rendering the
 * page the action ran on: `updateTag` (or an `expire: 0` profile) makes the
 * action's response re-render the current page, and with the account gone
 * that is the 401 page, which replaced the "Account deleted" state at once.
 * Marked stale now and expired a second later, so the next visit after that
 * renders fresh (the 404) instead of serving the old page while it
 * regenerates.
 */
export function expireDeletedUser(
  userId: string,
  usernames: ReadonlyArray<string>,
): void {
  for (const tag of userTags(userId, usernames)) {
    revalidateTag(tag, { expire: 1 });
  }
}
