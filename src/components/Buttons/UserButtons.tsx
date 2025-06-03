import { cachedUser } from '@/app/cached';
import auth from '@/auth';
import { isFollowing as _isFollowing } from '@/lib/db/follow';

import ContextMenuButtonUser from './ContextMenuButtonUser';
import EditProfileButton from './EditProfileButton';
import FollowButton from './FollowButton';

export default async function UserButtons({
  username,
}: Readonly<{
  username: string;
}>) {
  const user = await cachedUser({ username });
  if (!user) {
    return null;
  }

  const { user: userFromSession } = await auth();
  if (userFromSession) {
    const isFollowing = await _isFollowing({
      userId: userFromSession?.id,
      targetUserId: user.id,
    });

    return (
      <>
        {userFromSession.id === user.id ? (
          <EditProfileButton />
        ) : (
          <FollowButton username={username} isFollowing={isFollowing} />
        )}
        <ContextMenuButtonUser user={user} />
      </>
    );
  }

  return (
    <>
      <FollowButton isFollowing={false} username={username} />
      <ContextMenuButtonUser user={user} />
    </>
  );
}
