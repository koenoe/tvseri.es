'use client';

import { memo } from 'react';

import Link from 'next/link';

import { type UserWithFollowInfo } from '@/types/user';

import FollowButton from '../Buttons/FollowButton';

function Item({
  user,
}: Readonly<{
  user: UserWithFollowInfo;
}>) {
  return (
    <div className="relative flex flex-row gap-3 rounded-lg bg-black/10 p-3 md:flex-row md:items-center md:gap-4 md:p-4">
      <div>
        <div className="flex flex-nowrap gap-3">
          <Link
            className="w-full max-w-32 truncate md:max-w-max"
            title={user.username}
            href={`/u/${user.username}`}
          >
            {user.username}
          </Link>
        </div>
        <div className="mt-1 inline-flex gap-1.5 text-[0.65rem] text-white/50 md:text-xs">
          <div className="flex items-center space-x-1">
            <span>
              {user.followerCount.toLocaleString()} follower
              {user.followerCount !== 1 ? 's' : ''}
            </span>
            <span className="before:mr-1 before:content-['·']">
              following {user.followingCount.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
      <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-4 md:relative md:right-auto md:top-auto md:ml-auto md:-translate-y-0 md:gap-5">
        {user.isFollower ? (
          <span className="cursor-default text-nowrap rounded bg-white/20 px-1.5 py-1 text-[0.5rem] font-semibold uppercase text-white md:px-2.5 md:py-1.5 md:text-[0.65rem] md:tracking-wider">
            Follows you
          </span>
        ) : null}
        {user.isMe ? null : (
          <FollowButton
            isFollowing={user.isFollowing}
            username={user.username}
            size="small"
          />
        )}
      </div>
    </div>
  );
}

export default memo(Item);
