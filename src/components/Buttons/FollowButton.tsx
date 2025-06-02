'use client';

import { useCallback, useOptimistic, useState, useTransition } from 'react';

import AddButton from './AddButton';

export default function FollowButton({
  isFollowing: isFollowingFromProps,
  action,
  username,
}: Readonly<{
  isFollowing: boolean;
  action: (value: boolean) => void;
  username: string;
}>) {
  const [isFollowing, setIsFollowing] = useState(isFollowingFromProps);
  const [optimisticIsFollowing, setOptimisticIsFollowing] = useOptimistic(
    isFollowing,
    (_, optimisticValue: boolean) => optimisticValue,
  );
  const [isPending, startTransition] = useTransition();
  const handleOnClick = useCallback(
    (value: boolean) => {
      startTransition(async () => {
        setOptimisticIsFollowing(value);

        try {
          await action(value);

          setIsFollowing(value);
        } catch (error) {
          console.error(error);
        }
      });
    },
    [action, setOptimisticIsFollowing],
  );

  return (
    <AddButton
      isActive={optimisticIsFollowing}
      onClick={handleOnClick}
      isDisabled={isPending}
      title={`${optimisticIsFollowing ? 'Unfollow' : 'Follow'} '${username}'`}
    />
  );
}
