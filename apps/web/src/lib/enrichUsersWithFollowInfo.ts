import { type User } from '@tvseri.es/types';

import auth from '@/auth';
import {
  getFollowerCount,
  getFollowingCount,
  isFollower as _isFollower,
  isFollowing as _isFollowing,
} from '@/lib/db/follow';

export default async function enrichUsersWithFollowInfo(
  users: User[],
  options?: Readonly<{
    username: string;
    type: 'following' | 'followers';
  }>,
) {
  const { username, type = 'followers' } = options || {};
  const { user: userFromSession } = await auth();
  const isMeAndFollowers =
    userFromSession?.username === username && type === 'followers';

  return await Promise.all(
    users.map(async (u) => {
      const [followerCount, followingCount, isFollower, isFollowing] =
        await Promise.all([
          getFollowerCount(u.id),
          getFollowingCount(u.id),
          userFromSession && userFromSession.id !== u.id && !isMeAndFollowers
            ? _isFollower({
                userId: userFromSession.id,
                targetUserId: u.id,
              })
            : Promise.resolve(false),
          userFromSession && userFromSession.id !== u.id
            ? _isFollowing({
                userId: userFromSession.id,
                targetUserId: u.id,
              })
            : Promise.resolve(false),
        ]);

      return {
        ...u,
        followerCount,
        followingCount,
        isFollower,
        isFollowing,
        isMe: !!(userFromSession && userFromSession.id === u.id),
      };
    }),
  );
}
