import { Suspense } from 'react';

import { notFound } from 'next/navigation';

import Page from '@/components/Page/Page';
import SkeletonList from '@/components/Skeletons/SkeletonList';
import SkeletonPoster from '@/components/Skeletons/SkeletonPoster';
import BlockEpisodesWatched from '@/components/Stats/BlockEpisodesWatched';
import BlockFavorites from '@/components/Stats/BlockFavorites';
import BlockSeriesFinished from '@/components/Stats/BlockSeriesFinished';
import BlockSeriesInProgress from '@/components/Stats/BlockSeriesInProgress';
import BlockTotalRuntime from '@/components/Stats/BlockTotalRuntime';
import BlockWatchlist from '@/components/Stats/BlockWatchlist';
import MostWatchedGenresContainer from '@/components/Stats/MostWatchedGenresContainer';
import MostWatchedProvidersContainer from '@/components/Stats/MostWatchedProvidersContainer';
import PopularNotWatched from '@/components/Stats/PopularNotWatched';
import SkeletonBlock from '@/components/Stats/SkeletonBlock';
import SkeletonSpotlight from '@/components/Stats/SkeletonSpotlight';
import SpotlightContainer from '@/components/Stats/SpotlightContainer';
import SvgPattern from '@/components/Stats/SvgPattern';
import WatchedByYear from '@/components/Stats/Watched';
import WatchedPerWeekContainer from '@/components/Stats/WatchedPerWeekContainer';
import WorldMapContainer from '@/components/Stats/WorldMapContainer';
import { findUser } from '@/lib/db/user';

type Props = Readonly<{
  params: Promise<{ username: string; year: number }>;
}>;

export async function generateMetadata({ params }: Props) {
  const { username } = await params;
  const user = await findUser({ username });
  if (!user) {
    return {};
  }

  return {
    title: `A year of tvseri.es with ${user.username}`,
  };
}

export default async function StatsByYearPage({ params }: Props) {
  const { username, year } = await params;
  const user = await findUser({ username });
  if (!user) {
    return notFound();
  }

  return (
    <Page backgroundContext="dots">
      <div className="container relative h-[260px] sm:h-[325px] md:h-[390px]">
        <div className="absolute inset-0 [mask-image:linear-gradient(to_right,black,transparent_30%,transparent_70%,black)] xl:[mask-image:linear-gradient(to_right,black,transparent_35%,transparent_65%,black)]">
          <SvgPattern className="absolute left-[1rem] top-0 w-[280px] sm:w-[320px] md:w-[400px] lg:-top-8 lg:w-[480px]" />
          <SvgPattern className="absolute right-[1rem] top-0 w-[280px] scale-x-[-1] sm:w-[320px] md:w-[400px] lg:-top-8 lg:w-[480px]" />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <h1 className="text-[6rem] font-extrabold leading-none tracking-wide sm:text-[8rem] md:text-[10rem]">
            {year}
          </h1>
          <span className="mt-2 text-sm text-white/55 md:text-lg">
            A year of tvseri.es with
            <span className="ml-2 rounded bg-[#666] px-2 py-1 text-white">
              {user.username}
            </span>
          </span>
        </div>
      </div>
      <div className="container mt-10 md:mt-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <Suspense fallback={<SkeletonBlock />}>
            <BlockTotalRuntime userId={user.id} year={year} />
          </Suspense>
          <Suspense fallback={<SkeletonBlock />}>
            <BlockEpisodesWatched userId={user.id} year={year} />
          </Suspense>
          <Suspense fallback={<SkeletonBlock />}>
            <BlockSeriesFinished userId={user.id} year={year} />
          </Suspense>
          <Suspense fallback={<SkeletonBlock />}>
            <BlockSeriesInProgress userId={user.id} year={year} />
          </Suspense>
          <Suspense fallback={<SkeletonBlock />}>
            <BlockFavorites userId={user.id} year={year} />
          </Suspense>
          <Suspense fallback={<SkeletonBlock />}>
            <BlockWatchlist userId={user.id} year={year} />
          </Suspense>
        </div>
        <div className="relative mt-14 grid w-full grid-cols-1 gap-20 md:mt-20 xl:grid-cols-2 xl:gap-10">
          <div>
            <div className="mb-6 flex items-center gap-x-6">
              <h2 className="text-md lg:text-lg">First watch</h2>
              <div className="h-[3px] flex-grow bg-white/10" />
            </div>
            <Suspense fallback={<SkeletonSpotlight />}>
              <SpotlightContainer
                userId={user.id}
                year={year}
                boundary="first"
              />
            </Suspense>
          </div>
          <div>
            <div className="mb-6 flex items-center gap-x-6">
              <h2 className="text-md lg:text-lg">Last watch</h2>
              <div className="h-[3px] flex-grow bg-white/10" />
            </div>
            <Suspense fallback={<SkeletonSpotlight />}>
              <SpotlightContainer
                userId={user.id}
                year={year}
                boundary="last"
              />
            </Suspense>
          </div>
        </div>
        <div className="mt-20 h-[200px] w-full md:h-auto">
          <div className="mb-6 flex items-center gap-x-6">
            <h2 className="text-md lg:text-lg">By week</h2>
            <div className="h-[3px] flex-grow bg-white/10" />
          </div>
          <Suspense fallback={<div className="h-[200px] w-full" />}>
            <WatchedPerWeekContainer userId={user.id} year={year} />
          </Suspense>
        </div>
        <div className="mt-20 grid grid-cols-1 gap-20 xl:grid-cols-2 xl:gap-10">
          <div className="relative w-full">
            <div className="mb-6 flex items-center gap-x-6">
              <h2 className="text-md lg:text-lg">Genres</h2>
              <div className="h-[3px] flex-grow bg-white/10" />
            </div>
            <Suspense fallback={<div className="relative h-[704px] w-full" />}>
              <MostWatchedGenresContainer userId={user.id} year={year} />
            </Suspense>
          </div>
          <div className="relative h-full w-full">
            <div className="mb-6 flex items-center gap-x-6">
              <h2 className="text-md lg:text-lg">Streaming services</h2>
              <div className="h-[3px] flex-grow bg-white/10" />
            </div>
            <Suspense fallback={<div className="relative h-[704px] w-full" />}>
              <MostWatchedProvidersContainer userId={user.id} year={year} />
            </Suspense>
          </div>
        </div>
        <div className="mt-20">
          <div className="mb-6 flex items-center gap-x-6">
            <h2 className="text-md lg:text-lg">Finished in {year}</h2>
            <div className="h-[3px] flex-grow bg-white/10" />
          </div>
          <div className="grid grid-cols-4 gap-4 md:grid-cols-6 lg:grid-cols-8 xl:gap-6 2xl:grid-cols-10 [&>*]:!h-full [&>*]:!w-full">
            <Suspense
              fallback={
                <>
                  {[...Array(36)].map((_, index) => (
                    <SkeletonPoster key={index} />
                  ))}
                </>
              }
            >
              <WatchedByYear year={year} userId={user.id} />
            </Suspense>
          </div>
        </div>
        <div className="relative mt-20 w-full">
          <div className="mb-8 flex items-center gap-x-6">
            <h2 className="text-md lg:text-lg">World map</h2>
            <div className="h-[3px] flex-grow bg-white/10" />
          </div>
          <Suspense
            fallback={<div className="relative aspect-[192/95] w-full" />}
          >
            <WorldMapContainer userId={user.id} year={year} />
          </Suspense>
        </div>
      </div>
      <Suspense
        fallback={
          <SkeletonList
            className="mt-20"
            size="small"
            scrollBarClassName="h-[3px] rounded-none"
          />
        }
      >
        <PopularNotWatched year={year} className="mt-20" />
      </Suspense>
    </Page>
  );
}
