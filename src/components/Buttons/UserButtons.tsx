import { cachedUser } from '@/app/cached';
import auth from '@/auth';
import { follow, isFollowing, unfollow } from '@/lib/db/follow';

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

  async function followAction(value: boolean) {
    'use server';

    const { user: userFromSession, session } = await auth();
    if (!userFromSession || !session) {
      return;
    }

    const user = await cachedUser({ username });
    if (!user || user.id === userFromSession.id) {
      return;
    }

    const payload = {
      userId: userFromSession.id,
      targetUserId: user.id,
    };

    if (value) {
      await follow(payload);
    } else {
      await unfollow(payload);
    }
  }

  const { user: userFromSession } = await auth();
  if (userFromSession) {
    const _isFollowing = await isFollowing({
      userId: userFromSession?.id,
      targetUserId: user.id,
    });

    return (
      <>
        {userFromSession.id === user.id ? (
          <EditProfileButton />
        ) : (
          <FollowButton
            username={username}
            action={followAction}
            isFollowing={_isFollowing}
          />
        )}
        <ContextMenuButtonUser user={user} />
      </>
    );
  }

  return (
    <>
      <FollowButton
        isFollowing={false}
        action={followAction}
        username={username}
      />
      <ContextMenuButtonUser user={user} />
    </>
  );
}
