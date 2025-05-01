import { Suspense } from 'react';

import { unstable_cacheLife as cacheLife } from 'next/cache';
import { notFound } from 'next/navigation';

import Page from '@/components/Page/Page';
import SkeletonList from '@/components/Skeletons/SkeletonList';
import SkeletonPoster from '@/components/Skeletons/SkeletonPoster';
import BlockAverageEpisodes from '@/components/Stats/BlockAverageEpisodes';
import BlockEpisodesWatched from '@/components/Stats/BlockEpisodesWatched';
import BlockFavorites from '@/components/Stats/BlockFavorites';
import BlockLongestStreak from '@/components/Stats/BlockLongestStreak';
import BlockTotalRuntime from '@/components/Stats/BlockTotalRuntime';
import BlockTvSeriesWatched from '@/components/Stats/BlockTvSeriesWatched';
import Grid from '@/components/Stats/Grid';
import MostWatchedGenresContainer from '@/components/Stats/MostWatchedGenresContainer';
import MostWatchedProvidersContainer from '@/components/Stats/MostWatchedProvidersContainer';
import PopularNotWatched from '@/components/Stats/PopularNotWatched';
import SkeletonBlock from '@/components/Stats/SkeletonBlock';
import SkeletonSpotlight from '@/components/Stats/SkeletonSpotlight';
import SpotlightContainer from '@/components/Stats/SpotlightContainer';
import SvgGlowAnimatePattern from '@/components/Stats/SvgGlowAnimatePattern';
import WatchedByYear from '@/components/Stats/Watched';
import WatchedPerWeekContainer from '@/components/Stats/WatchedPerWeekContainer';
import WorldMapContainer from '@/components/Stats/WorldMapContainer';
import { findUser } from '@/lib/db/user';

type Props = Readonly<{
  params: Promise<{ username: string; year: number }>;
}>;

export async function generateMetadata({ params }: Props) {
  'use cache';
  cacheLife('days');

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
  'use cache';
  cacheLife('days');

  const { username, year } = await params;
  const user = await findUser({ username });
  if (!user) {
    return notFound();
  }

  return (
    <Page backgroundContext="dots">
      <div className="container relative h-[300px] md:h-[360px]">
        <div className="absolute inset-0 overflow-hidden [mask-image:linear-gradient(to_right,black,transparent_30%,transparent_70%,black)] xl:[mask-image:linear-gradient(to_right,black,transparent_35%,transparent_65%,black)]">
          <SvgGlowAnimatePattern className="absolute left-[0.5rem] top-1/2 w-1/2 -translate-y-1/2 md:left-[2rem]" />
          <SvgGlowAnimatePattern className="absolute right-[0.5rem] top-1/2 w-1/2 -translate-y-1/2 scale-x-[-1] md:right-[2rem]" />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <h1 className="text-[6rem] font-extrabold leading-none tracking-wide sm:text-[8rem] md:text-[10rem]">
            {year}
          </h1>
          <div className="mt-2 text-sm text-white/55 md:text-lg">
            A year of tvseri.es with
            <span className="ml-2 rounded bg-[#666] px-2 py-1 text-white">
              {user.username}
            </span>
          </div>
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
            <BlockAverageEpisodes userId={user.id} year={year} />
          </Suspense>
          <Suspense fallback={<SkeletonBlock />}>
            <BlockTvSeriesWatched userId={user.id} year={year} />
          </Suspense>
          <Suspense fallback={<SkeletonBlock />}>
            <BlockLongestStreak userId={user.id} year={year} />
          </Suspense>
          <Suspense fallback={<SkeletonBlock />}>
            <BlockFavorites userId={user.id} year={year} />
          </Suspense>
        </div>
        <div className="relative mt-14 grid w-full grid-cols-1 gap-20 md:mt-20 xl:grid-cols-2 xl:gap-10">
          <div>
            <div className="mb-6 flex items-center gap-x-6">
              <h2 className="text-md lg:text-lg">First watch</h2>
              <div className="h-[3px] flex-grow bg-white/10" />
            </div>
            <Suspense
              fallback={
                <div className="bg-white/5">
                  <SkeletonSpotlight />
                </div>
              }
            >
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
            <Suspense
              fallback={
                <div className="bg-white/5">
                  <SkeletonSpotlight />
                </div>
              }
            >
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
            <h2 className="text-md lg:text-lg">Watched</h2>
            <div className="h-[3px] flex-grow bg-white/10" />
          </div>
          <Grid>
            <Suspense
              fallback={
                <>
                  {[...Array(30)].map((_, index) => (
                    <SkeletonPoster key={index} />
                  ))}
                </>
              }
            >
              <WatchedByYear year={year} userId={user.id} />
            </Suspense>
          </Grid>
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
            size="medium"
            scrollBarClassName="h-[3px] rounded-none"
          />
        }
      >
        <PopularNotWatched userId={user.id} year={year} className="mt-20" />
      </Suspense>
    </Page>
  );
}
