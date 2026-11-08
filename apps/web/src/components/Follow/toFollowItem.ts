import type { UserWithFollowInfo } from '@tvseri.es/schemas';
import { pick } from '@tvseri.es/utils';

const FOLLOW_ITEM_KEYS = [
  'followerCount',
  'followingCount',
  'id',
  'isFollower',
  'isFollowing',
  'isMe',
  'username',
] as const satisfies ReadonlyArray<keyof UserWithFollowInfo>;

/** The fields a follow card item reads. */
export type FollowItem = Readonly<
  Pick<UserWithFollowInfo, (typeof FOLLOW_ITEM_KEYS)[number]>
>;

/**
 * Trims a follower/following entry to what the card renders (no `createdAt`
 * etc.), for both the first page (RSC props) and later pages (route handler).
 */
export const toFollowItem = (item: FollowItem): FollowItem =>
  pick(item, FOLLOW_ITEM_KEYS);
