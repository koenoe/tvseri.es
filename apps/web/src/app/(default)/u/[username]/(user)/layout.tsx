import { type ReactNode, Suspense } from 'react';

import UserButtons from '@/components/Buttons/UserButtons';
import Page from '@/components/Page/Page';
import SkeletonCircleButton from '@/components/Skeletons/SkeletonCircleButton';
import BlockEpisodesWatched from '@/components/UserHeader/BlockEpisodesWatched';
import BlockFavorites from '@/components/UserHeader/BlockFavorites';
import BlockFollowers from '@/components/UserHeader/BlockFollowers';
import BlockFollowing from '@/components/UserHeader/BlockFollowing';
import BlockSeriesFinished from '@/components/UserHeader/BlockSeriesFinished';
import BlockTotalRuntime from '@/components/UserHeader/BlockTotalRuntime';
import UserPills from '@/components/UserHeader/Pills';
import SkeletonBlock from '@/components/UserHeader/SkeletonBlock';
import UserInfo from '@/components/UserHeader/UserInfo';

export default function Layout({
  children,
  params,
}: Readonly<{
  children: ReactNode;
  params: Promise<{ username: string }>;
}>) {
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
            <UserInfo params={params} />
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
              <UserButtons params={params} />
            </div>
          </Suspense>
        </div>

        <div className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <Suspense fallback={<SkeletonBlock />}>
            <BlockTotalRuntime params={params} />
          </Suspense>
          <Suspense fallback={<SkeletonBlock />}>
            <BlockEpisodesWatched params={params} />
          </Suspense>
          <Suspense fallback={<SkeletonBlock />}>
            <BlockSeriesFinished params={params} />
          </Suspense>
          <Suspense fallback={<SkeletonBlock />}>
            <BlockFavorites params={params} />
          </Suspense>
          <Suspense fallback={<SkeletonBlock />}>
            <BlockFollowing params={params} />
          </Suspense>
          <Suspense fallback={<SkeletonBlock />}>
            <BlockFollowers params={params} />
          </Suspense>
        </div>
        <div className="relative mb-10 w-full bg-neutral-900">
          <Suspense
            fallback={
              <div className="w-full rounded-lg bg-neutral-800/50 h-14 text-white/40" />
            }
          >
            <UserPills params={params} />
          </Suspense>
        </div>
        {children}
      </div>
    </Page>
  );
}
