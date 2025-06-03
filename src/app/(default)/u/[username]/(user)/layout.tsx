import { Suspense, type ReactNode } from 'react';

import UserButtons from '@/components/Buttons/UserButtons';
import Page from '@/components/Page/Page';
import SkeletonCircleButton from '@/components/Skeletons/SkeletonCircleButton';
import Pills from '@/components/Tabs/Pills';
import BlockEpisodesWatched from '@/components/UserHeader/BlockEpisodesWatched';
import BlockFavorites from '@/components/UserHeader/BlockFavorites';
import BlockFollowers from '@/components/UserHeader/BlockFollowers';
import BlockFollowing from '@/components/UserHeader/BlockFollowing';
import BlockSeriesFinished from '@/components/UserHeader/BlockSeriesFinished';
import BlockTotalRuntime from '@/components/UserHeader/BlockTotalRuntime';
import SkeletonBlock from '@/components/UserHeader/SkeletonBlock';
import UserInfo from '@/components/UserHeader/UserInfo';

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
      label: 'Social',
      href: `/u/${username}/social`,
    },
    {
      label: 'Stats',
      href: `/u/${username}/stats/${year}`,
    },
  ] as const;

  return (
    <Page backgroundContext="dots">
      <div className="container">
        <div className="mb-10 flex items-center justify-between md:justify-center md:space-x-6">
          <Suspense
            fallback={
              <div className="flex flex-col space-y-1 md:space-y-2">
                <div className="h-10 w-36 animate-pulse bg-white/20" />
                <div className="h-6 w-44 animate-pulse bg-white/10" />
              </div>
            }
          >
            <UserInfo username={username} />
          </Suspense>
          <Suspense
            fallback={
              <div className="flex space-x-2">
                <SkeletonCircleButton />
                <SkeletonCircleButton />
              </div>
            }
          >
            <div className="flex space-x-2">
              <UserButtons username={username} />
            </div>
          </Suspense>
        </div>

        <div className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <Suspense fallback={<SkeletonBlock />}>
            <BlockTotalRuntime username={username} />
          </Suspense>
          <Suspense fallback={<SkeletonBlock />}>
            <BlockEpisodesWatched username={username} />
          </Suspense>
          <Suspense fallback={<SkeletonBlock />}>
            <BlockSeriesFinished username={username} />
          </Suspense>
          <Suspense fallback={<SkeletonBlock />}>
            <BlockFavorites username={username} />
          </Suspense>
          <Suspense fallback={<SkeletonBlock />}>
            <BlockFollowing username={username} />
          </Suspense>
          <Suspense fallback={<SkeletonBlock />}>
            <BlockFollowers username={username} />
          </Suspense>
        </div>
        <div className="relative mb-10 w-full">
          <Pills items={menuItems} layoutId="profile" className="w-full" />
        </div>
        {children}
      </div>
    </Page>
  );
}
