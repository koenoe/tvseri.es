'use client';

import Link from 'next/link';
import { memo } from 'react';

import FollowButton from '../Buttons/FollowButton';
import { UserCheckIcon } from '../Icons/UserCheckIcon';
import { UsersIcon } from '../Icons/UsersIcon';
import type { FollowItem } from './toFollowItem';

const usersIcon = <UsersIcon className="size-3 flex-shrink-0 md:size-3.5" />;
const userCheckIcon = (
  <UserCheckIcon className="size-3 flex-shrink-0 md:size-3.5" />
);

function Item({
  user,
}: Readonly<{
  user: FollowItem;
}>) {
  return (
    <div className="relative flex flex-row gap-3 rounded-xl bg-black/10 p-3 md:flex-row md:items-center md:gap-4 md:p-4">
      {/* On mobile the buttons are absolutely positioned on the right; keep
          the text clear of them */}
      <div className="min-w-0 pr-32 md:pr-0">
        <div className="flex flex-nowrap gap-3">
          <Link
            className="w-full max-w-32 truncate md:max-w-max"
            href={{
              pathname: `/u/${user.username}`,
            }}
            title={user.username}
          >
            {user.username}
          </Link>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[0.65rem] text-white/50 md:text-xs">
          <span className="flex items-center gap-1 text-nowrap">
            {usersIcon}
            {user.followerCount.toLocaleString()} follower
            {user.followerCount !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1 text-nowrap">
            {userCheckIcon}
            {user.followingCount.toLocaleString()} following
          </span>
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
            size="small"
            username={user.username}
          />
        )}
      </div>
    </div>
  );
}

export default memo(Item);
