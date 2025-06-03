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
    <div className="relative flex flex-col gap-4 rounded-lg bg-black/10 p-4 md:flex-row md:items-center">
      <div>
        <div className="flex flex-nowrap gap-3">
          <Link
            className="w-[calc(100%-6.5rem)] truncate md:w-full"
            href={`/u/${user.username}`}
          >
            {user.username}
          </Link>
        </div>
        <div className="mt-1 flex w-full gap-1.5 text-xs text-white/50">
          <div className="flex items-center space-x-1 text-xs text-white/50">
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
      <div className="flex items-center gap-4 md:ml-auto">
        {user.isFollower ? (
          <span className="cursor-default rounded bg-white/20 px-2.5 py-1.5 text-[0.65rem] font-semibold uppercase tracking-wider text-white">
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
