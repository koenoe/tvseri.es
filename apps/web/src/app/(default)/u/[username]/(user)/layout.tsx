import { type ReactNode, Suspense } from 'react';

import UserButtons from '@/components/Buttons/UserButtons';
import Page from '@/components/Page/Page';
import SkeletonCircleButton from '@/components/Skeletons/SkeletonCircleButton';
import CountBlock from '@/components/UserHeader/CountBlock';
import UserPills from '@/components/UserHeader/Pills';
import SkeletonBlock from '@/components/UserHeader/SkeletonBlock';
import UserInfo from '@/components/UserHeader/UserInfo';
import formatRuntime from '@/utils/formatRuntime';

const formatTotalRuntime = (minutes: number) => formatRuntime(minutes, false);

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
          <Suspense fallback={<SkeletonCircleButton />}>
            <UserButtons params={params} />
          </Suspense>
        </div>

        <div className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <Suspense fallback={<SkeletonBlock />}>
            <CountBlock
              count="totalRuntime"
              format={formatTotalRuntime}
              label="Total runtime"
              params={params}
            />
          </Suspense>
          <Suspense fallback={<SkeletonBlock />}>
            <CountBlock
              count="episodesWatched"
              label="Episodes watched"
              params={params}
            />
          </Suspense>
          <Suspense fallback={<SkeletonBlock />}>
            <CountBlock
              count="seriesFinished"
              label="Series finished"
              params={params}
            />
          </Suspense>
          <Suspense fallback={<SkeletonBlock />}>
            <CountBlock count="favorites" label="Favorites" params={params} />
          </Suspense>
          <Suspense fallback={<SkeletonBlock />}>
            <CountBlock count="following" label="Following" params={params} />
          </Suspense>
          <Suspense fallback={<SkeletonBlock />}>
            <CountBlock count="followers" label="Followers" params={params} />
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
