'use client';

import { useCallback, useOptimistic, useState, useTransition } from 'react';

import { toggleFollow } from '@/app/actions';

import AddButton from './AddButton';
import { type ButtonVariantProps } from './CircleButton';

export default function FollowButton({
  isFollowing: isFollowingFromProps,
  username,
  size,
}: ButtonVariantProps &
  Readonly<{
    isFollowing: boolean;
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
          await toggleFollow(value, username);

          setIsFollowing(value);
        } catch (error) {
          console.error(error);
        }
      });
    },
    [setOptimisticIsFollowing, username],
  );

  return (
    <AddButton
      size={size}
      isActive={optimisticIsFollowing}
      onClick={handleOnClick}
      isDisabled={isPending}
      title={`${optimisticIsFollowing ? 'Unfollow' : 'Follow'} '${username}'`}
    />
  );
}
