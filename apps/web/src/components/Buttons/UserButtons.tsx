import { cachedUser } from '@/app/cached';
import auth from '@/auth';
import { isFollowing as isFollowingResult } from '@/lib/api';

import ContextMenuButtonUser from './ContextMenuButtonUser';
import EditProfileButton from './EditProfileButton';
import FollowButton from './FollowButton';

/**
 * Rendered in the /u/[username] (user) layout, which requires a session
 * (see proxy.ts), so there is no logged-out variant.
 */
export default async function UserButtons({
  params,
}: Readonly<{
  params: Promise<{
    username: string;
  }>;
}>) {
  const { username } = await params;
  const [user, { user: userFromSession }] = await Promise.all([
    cachedUser({ username }),
    auth(),
  ]);

  if (!user || !userFromSession) {
    return null;
  }

  const isMe = userFromSession.id === user.id;
  const isFollowing = isMe
    ? false
    : await isFollowingResult({
        targetUserId: user.id,
        userId: userFromSession.id,
      });

  return (
    <>
      {isMe ? (
        <EditProfileButton />
      ) : (
        <FollowButton isFollowing={isFollowing} username={username} />
      )}
      <ContextMenuButtonUser user={user} />
    </>
  );
}
