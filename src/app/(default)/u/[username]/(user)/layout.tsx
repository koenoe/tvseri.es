import { Suspense, type ReactNode } from 'react';

import Page from '@/components/Page/Page';
import SkeletonCircleButton from '@/components/Skeletons/SkeletonCircleButton';
import Pills from '@/components/Tabs/Pills';
import UserHeader from '@/components/UserHeader/UserHeader';

const year = new Date().getFullYear();

export default async function Layout({
  children,
  params,
}: Readonly<{
  children: ReactNode;
  params: Promise<{ username: string }>;
}>) {
  const { username } = await params;

  const menuItems = [
    // {
    //   label: 'Profile',
    //   href: `/u/${username}`,
    // },
    {
      label: 'In progress',
      href: `/u/${username}/in-progress`,
    },
    {
      label: 'Finished',
      href: `/u/${username}/finished`,
    },
    {
      label: 'Watchlist',
      href: `/u/${username}/watchlist`,
    },
    {
      label: 'Favorites',
      href: `/u/${username}/favorites`,
    },
    {
      label: 'Stats',
      href: `/u/${username}/stats/${year}`,
    },
  ] as const;

  return (
    <Page backgroundContext="dots">
      <div className="container">
        <Suspense
          fallback={
            <div className="mb-10 flex items-center justify-center space-x-6">
              <div className="flex flex-col space-y-2">
                <div className="h-6 w-36 animate-pulse bg-white/20" />
                <div className="h-4 w-44 animate-pulse bg-white/10" />
              </div>
              <div className="flex items-center justify-center space-x-2">
                <SkeletonCircleButton size="small" />
                <SkeletonCircleButton size="small" />
              </div>
            </div>
          }
        >
          <UserHeader username={username} className="mb-10" />
        </Suspense>
        <div className="relative mb-10 w-full">
          <Pills items={menuItems} layoutId="profile" className="w-full" />
        </div>
        {children}
      </div>
    </Page>
  );
}
