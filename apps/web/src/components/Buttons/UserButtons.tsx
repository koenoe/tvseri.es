import { cachedUser } from '@/app/cached';
import auth from '@/auth';
import { isFollowing as isFollowingResult } from '@/lib/api';

import ContextMenuButtonUser from './ContextMenuButtonUser';
import EditProfileButton from './EditProfileButton';
import FollowButton from './FollowButton';

export default async function UserButtons({
  params,
}: Readonly<{
  params: Promise<{
    username: string;
  }>;
}>) {
  const { username } = await params;
  const user = await cachedUser({ username });
  if (!user) {
    return null;
  }

  const { user: userFromSession } = await auth();
  if (userFromSession) {
    const isFollowing = await isFollowingResult({
      targetUserId: user.id,
      userId: userFromSession?.id,
    });

    return (
      <>
        {userFromSession.id === user.id ? (
          <EditProfileButton />
        ) : (
          <FollowButton isFollowing={isFollowing} username={username} />
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
