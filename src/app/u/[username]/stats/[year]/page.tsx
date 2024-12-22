import { Suspense } from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import Page from '@/components/Page/Page';
import SkeletonList from '@/components/Skeletons/SkeletonList';
import SpotlightBackground from '@/components/Spotlight/SpotlightBackground';
import SpotlightTitle from '@/components/Spotlight/SpotlightTitle';
import Block from '@/components/Stats/Block';
import MostWatchedGenres from '@/components/Stats/MostWatchedGenres';
import MostWatchedProviders from '@/components/Stats/MostWatchedProviders';
import PopularNotWatched from '@/components/Stats/PopularNotWatched';
import SvgPattern from '@/components/Stats/SvgPattern';
import WatchedByYear from '@/components/Stats/Watched';
import WatchedPerWeek from '@/components/Stats/WatchedPerWeek';
import WorldMap from '@/components/Stats/WorldMap';
import { findUser } from '@/lib/db/user';
import { fetchTvSeries } from '@/lib/tmdb';

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

  const firstShow = await fetchTvSeries(66276, {
    includeImages: true,
  });

  const lastShow = await fetchTvSeries(1396, {
    includeImages: true,
  });

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
          <Block label="Total runtime" value="17d 15h 59m" />
          <Block label="Episodes watched" value="1,831" />
          <Block label="Series finished" value="12" />
          <Block label="In progress" value="18" />
          <Block label="Added to favorites" value="78" />
          <Block label="Want to watch" value="36" />
        </div>
        <div className="relative mt-14 grid w-full grid-cols-1 gap-20 md:mt-20 xl:grid-cols-2 xl:gap-10">
          <div>
            <div className="mb-6 flex items-center gap-x-6">
              <h2 className="text-md lg:text-lg">First watch</h2>
              <div className="h-[3px] flex-grow bg-white/10" />
            </div>
            <Link
              href={`/tv/${firstShow!.id}/${firstShow!.slug}`}
              className="relative flex aspect-[16/14] flex-shrink-0 items-end overflow-clip rounded shadow-lg after:absolute after:inset-0 after:rounded after:shadow-[inset_0_0_0_1px_rgba(221,238,255,0.08)] after:content-[''] md:aspect-[16/10] lg:aspect-[16/8] xl:aspect-[16/12] 2xl:aspect-[16/10]"
            >
              <SpotlightBackground item={firstShow!} />
              <div className="w-full p-9 xl:p-12">
                <SpotlightTitle item={firstShow!} size="small" />
                <div className="mt-6 flex gap-4 whitespace-nowrap text-white/60 md:gap-12">
                  <div className="relative flex w-full justify-center gap-2 text-xs md:justify-start md:text-[0.8rem]">
                    <div className="after:ml-2 after:content-['·']">
                      2024-01-01
                    </div>
                    <div className="after:ml-2 after:content-['·']">S01E01</div>
                    <div className="after:ml-2 after:content-['·']">
                      Part 1: The Beach
                    </div>
                    <div>1h 19m</div>
                  </div>
                </div>
              </div>
              <Image
                className="absolute right-4 top-4 z-10 h-8 w-8 rounded-md"
                src="https://image.tmdb.org/t/p/w92/fksCUZ9QDWZMUwL2LgMtLckROUN.jpg"
                alt=""
                unoptimized
                width={92}
                height={92}
              />
            </Link>
          </div>
          <div>
            <div className="mb-6 flex items-center gap-x-6">
              <h2 className="text-md lg:text-lg">Last watch</h2>
              <div className="h-[3px] flex-grow bg-white/10" />
            </div>
            <Link
              href={`/tv/${lastShow!.id}/${lastShow!.slug}`}
              className="relative flex aspect-[16/14] flex-shrink-0 items-end overflow-clip rounded shadow-lg after:absolute after:inset-0 after:rounded after:shadow-[inset_0_0_0_1px_rgba(221,238,255,0.08)] after:content-[''] md:aspect-[16/10] lg:aspect-[16/8] xl:aspect-[16/12] 2xl:aspect-[16/10]"
            >
              <SpotlightBackground item={lastShow!} />
              <div className="w-full p-9 xl:p-12">
                <SpotlightTitle item={lastShow!} size="small" />
                <div className="mt-6 flex gap-4 whitespace-nowrap text-white/60 md:gap-12">
                  <div className="relative flex w-full justify-center gap-2 text-xs md:justify-start md:text-[0.8rem]">
                    <div className="after:ml-2 after:content-['·']">
                      2024-12-31
                    </div>
                    <div className="after:ml-2 after:content-['·']">S05E16</div>
                    <div className="after:ml-2 after:content-['·']">Felina</div>
                    <div>56m</div>
                  </div>
                </div>
              </div>
              <Image
                className="absolute right-4 top-4 z-10 h-8 w-8 rounded-md"
                src="https://image.tmdb.org/t/p/w92/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg"
                alt=""
                unoptimized
                width={92}
                height={92}
              />
            </Link>
          </div>
        </div>
        <WatchedPerWeek />
        <div className="mt-20 grid grid-cols-1 gap-20 xl:grid-cols-2 xl:gap-10">
          <MostWatchedGenres />
          <MostWatchedProviders />
        </div>
        <div className="mt-20">
          <Suspense fallback={null}>
            <WatchedByYear year={year} userId={user.id} />
          </Suspense>
        </div>
        <WorldMap className="mt-20" />
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
