'use client';

import { use } from 'react';

import { BarChartIcon } from '../Icons/BarChartIcon';
import { CircleCheckIcon } from '../Icons/CircleCheckIcon';
import { ClockOutlineIcon } from '../Icons/ClockOutlineIcon';
import { HeartOutlineIcon } from '../Icons/HeartOutlineIcon';
import { HistoryIcon } from '../Icons/HistoryIcon';
import { InProgressIcon } from '../Icons/InProgressIcon';
import { UsersIcon } from '../Icons/UsersIcon';
import Pills from '../Tabs/Pills';

const iconClassName = 'size-4 flex-shrink-0';

/**
 * Client component: the Stats link needs the current year, which can't be
 * read while prerendering a server component (Cache Components).
 */
export default function UserPills({
  params,
}: Readonly<{
  params: Promise<{
    username: string;
  }>;
}>) {
  const { username } = use(params);
  // UTC, so the server's (SSR) and the browser's (hydration) year agree
  // around New Year in every time zone
  const year = new Date().getUTCFullYear();

  const menuItems = [
    // {
    //   label: 'Profile',
    //   href: `/u/${username}`,
    // },
    {
      href: `/u/${username}/in-progress`,
      icon: <InProgressIcon className={iconClassName} />,
      label: 'In progress',
    },
    {
      href: `/u/${username}/history`,
      icon: <HistoryIcon className={iconClassName} />,
      label: 'History',
    },
    {
      href: `/u/${username}/finished`,
      icon: <CircleCheckIcon className={iconClassName} />,
      label: 'Finished',
    },
    {
      href: `/u/${username}/watchlist`,
      icon: <ClockOutlineIcon className={iconClassName} />,
      label: 'Watchlist',
    },
    {
      href: `/u/${username}/favorites`,
      icon: <HeartOutlineIcon className={iconClassName} />,
      label: 'Favorites',
    },
    {
      href: `/u/${username}/social`,
      icon: <UsersIcon className={iconClassName} />,
      label: 'Social',
    },
    {
      href: `/u/${username}/stats/${year}`,
      icon: <BarChartIcon className={iconClassName} />,
      label: 'Stats',
    },
  ] as const;

  return <Pills className="w-full" items={menuItems} layoutId="profile" />;
}
