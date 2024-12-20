import { cx } from 'class-variance-authority';
import Image from 'next/image';
import { notFound } from 'next/navigation';

import Page from '@/components/Page/Page';
import SpotlightBackground from '@/components/Spotlight/SpotlightBackground';
import SpotlightTitle from '@/components/Spotlight/SpotlightTitle';
import MostWatchedGenres from '@/components/Stats/MostWatchedGenres';
import MostWatchedProviders from '@/components/Stats/MostWatchedProviders';
import WatchedPerWeek from '@/components/Stats/WatchedPerWeek';
import { findUser } from '@/lib/db/user';
import { fetchTvSeries } from '@/lib/tmdb';

type Props = Readonly<{
  params: Promise<{ username: string }>;
}>;

const colours = ['#666666', '#00FFFF', '#FF0080']; // darker grey, cyan, magenta

const SvgPattern = ({ className }: Readonly<{ className?: string }>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 480 390"
    className={cx('scale-y-150 md:scale-y-125 lg:scale-y-100', className)}
  >
    <g fill="none" fillRule="evenodd">
      <g transform="translate(447 121)">
        <rect fill={colours[0]} y="55" width="5" height="90"></rect>
        <rect fill={colours[1]} width="5" height="48"></rect>
        <rect fill={colours[2]} y="169" width="5" height="22"></rect>
      </g>
      <g transform="translate(417 111)">
        <rect fill={colours[0]} y="66" width="5" height="80"></rect>
        <rect fill={colours[1]} width="5" height="38"></rect>
        <rect fill={colours[2]} y="152" width="5" height="42"></rect>
      </g>
      <g transform="translate(387 84)">
        <rect fill={colours[0]} y="78" width="5" height="100"></rect>
        <rect fill={colours[2]} y="201" width="5" height="42"></rect>
        <rect fill={colours[1]} width="5" height="70"></rect>
      </g>
      <g transform="translate(357 80)">
        <rect fill={colours[0]} y="96" width="5" height="85"></rect>
        <rect fill={colours[0]} y="68" width="5" height="20"></rect>
        <rect fill={colours[1]} width="5" height="57"></rect>
        <rect fill={colours[2]} y="212" width="5" height="42"></rect>
      </g>
      <g transform="translate(327 96)">
        <rect fill={colours[0]} y="48" width="5" height="80"></rect>
        <rect fill={colours[1]} y="12" width="5" height="28"></rect>
        <rect fill={colours[1]} width="5" height="4"></rect>
        <rect fill={colours[2]} y="144" width="5" height="32"></rect>
      </g>
      <g transform="translate(297 111)">
        <rect fill={colours[0]} y="46" width="5" height="70"></rect>
        <rect fill={colours[0]} y="124" width="5" height="4"></rect>
        <rect fill={colours[1]} width="5" height="38"></rect>
        <rect fill={colours[2]} y="142" width="5" height="32"></rect>
      </g>
      <g transform="translate(267 40)">
        <rect fill={colours[0]} y="102" width="5" height="90"></rect>
        <rect fill={colours[2]} y="210" width="5" height="22"></rect>
        <rect fill={colours[1]} width="5" height="80"></rect>
      </g>
      <g transform="translate(237 86)">
        <rect fill={colours[0]} y="36" width="5" height="90"></rect>
        <rect fill={colours[1]} width="5" height="28"></rect>
        <rect fill={colours[2]} y="132" width="5" height="42"></rect>
      </g>
      <g transform="translate(207 86)">
        <rect fill={colours[0]} y="36" width="5" height="70"></rect>
        <rect fill={colours[1]} width="5" height="28"></rect>
        <rect fill={colours[2]} y="132" width="5" height="32"></rect>
      </g>
      <g transform="translate(177 111)">
        <rect fill={colours[0]} y="36" width="5" height="85"></rect>
        <rect fill={colours[1]} width="5" height="28"></rect>
        <rect fill={colours[2]} y="132" width="5" height="42"></rect>
      </g>
      <g transform="translate(147 82)">
        <rect fill={colours[0]} y="102" width="5" height="90"></rect>
        <rect fill={colours[2]} y="210" width="5" height="22"></rect>
        <rect fill={colours[1]} width="5" height="80"></rect>
      </g>
      <g transform="translate(117 74)">
        <rect fill={colours[0]} y="51" width="5" height="160"></rect>
        <rect fill={colours[1]} width="5" height="14"></rect>
        <rect fill={colours[1]} y="23" width="5" height="20"></rect>
        <rect fill={colours[2]} y="246" width="5" height="24"></rect>
      </g>
      <g transform="translate(87 127)">
        <rect fill={colours[0]} y="64" width="5" height="50"></rect>
        <rect fill={colours[2]} y="144" width="5" height="64"></rect>
        <rect fill={colours[1]} width="5" height="30"></rect>
      </g>
      <g transform="translate(57 77)">
        <rect fill={colours[0]} y="104" width="5" height="80"></rect>
        <rect fill={colours[2]} y="204" width="5" height="74"></rect>
        <rect fill={colours[1]} width="5" height="34"></rect>
        <rect fill={colours[1]} y="32" width="5" height="40"></rect>
      </g>
      <g transform="translate(27 117)">
        <rect fill={colours[0]} y="84" width="5" height="80"></rect>
        <rect fill={colours[2]} y="184" width="5" height="34"></rect>
        <rect fill={colours[2]} y="232" width="5" height="14"></rect>
        <rect fill={colours[1]} width="5" height="40"></rect>
      </g>
    </g>
  </svg>
);

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
  const { username } = await params;
  const user = await findUser({ username });
  if (!user) {
    return notFound();
  }

  /*
    - total days/hours watched
    - total episodes watched
    - total shows finished
    - total shows unfinished
    - total added to watchlist
    - total favourited

    - first play of 2024
    - last play of 2024

    - most watched genres
    - most watched streaming services
    - most watched countries (world map)
    - most watched cast
    - most watched directors/creators

    - all watched shows in 2024 (grid)
    - popular shows in 2024 you didn't watch
  */

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
            2024
          </h1>
          <span className="mt-2 text-sm text-white/55 md:text-lg">
            A year of tvseri.es with
            <span
              className="ml-2 rounded px-2 py-1 text-white"
              style={{
                backgroundColor: colours[0],
              }}
            >
              koenoe
            </span>
          </span>
        </div>
      </div>
      <div className="container mt-10 md:mt-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <div className="flex flex-col justify-center gap-y-1 whitespace-nowrap rounded bg-[#333] p-3 md:gap-y-2 md:p-6">
            <span className="text-[0.65rem] text-white/60 md:text-sm">
              Total runtime
            </span>
            <span className="text-lg font-semibold md:text-2xl">
              17d 15h 59m
            </span>
          </div>
          <div className="flex flex-col justify-center gap-y-1 whitespace-nowrap rounded bg-[#333] p-3 md:gap-y-2 md:p-6">
            <span className="text-[0.65rem] text-white/60 md:text-sm">
              Episodes watched
            </span>
            <span className="text-lg font-semibold md:text-2xl">1,831</span>
          </div>
          <div className="flex flex-col justify-center gap-y-1 whitespace-nowrap rounded bg-[#333] p-3 md:gap-y-2 md:p-6">
            <span className="text-[0.65rem] text-white/60 md:text-sm">
              Series finished
            </span>
            <span className="text-lg font-semibold md:text-2xl">12</span>
          </div>
          <div className="flex flex-col justify-center gap-y-1 whitespace-nowrap rounded bg-[#333] p-3 md:gap-y-2 md:p-6">
            <span className="text-[0.65rem] text-white/60 md:text-sm">
              In progress
            </span>
            <span className="text-lg font-semibold md:text-2xl">18</span>
          </div>
          <div className="flex flex-col justify-center gap-y-1 whitespace-nowrap rounded bg-[#333] p-3 md:gap-y-2 md:p-6">
            <span className="text-[0.65rem] text-white/60 md:text-sm">
              Added to favorites
            </span>
            <span className="text-lg font-semibold md:text-2xl">78</span>
          </div>
          <div className="flex flex-col justify-center gap-y-1 whitespace-nowrap rounded bg-[#333] p-3 md:gap-y-2 md:p-6">
            <span className="text-[0.65rem] text-white/60 md:text-sm">
              Want to watch
            </span>
            <span className="text-lg font-semibold md:text-2xl">36</span>
          </div>
        </div>

        <div className="relative mt-14 grid w-full grid-cols-1 gap-10 md:mt-20 xl:grid-cols-2">
          <div>
            <div className="mb-6 flex items-center gap-x-6">
              <h2 className="text-md lg:text-lg">First watch</h2>
              <div className="h-[2px] flex-grow bg-white/10" />
            </div>
            <div className="relative flex aspect-[16/14] flex-shrink-0 items-end overflow-clip rounded shadow-lg after:absolute after:inset-0 after:rounded after:shadow-[inset_0_0_0_1px_rgba(221,238,255,0.08)] after:content-[''] md:aspect-[16/10] lg:aspect-[16/8] xl:aspect-[16/12] 2xl:aspect-[16/10]">
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
            </div>
          </div>
          <div>
            <div className="mb-6 flex items-center gap-x-6">
              <h2 className="text-md lg:text-lg">Last watch</h2>
              <div className="h-[2px] flex-grow bg-white/10" />
            </div>
            <div className="relative flex aspect-[16/14] flex-shrink-0 items-end overflow-clip rounded shadow-lg after:absolute after:inset-0 after:rounded after:shadow-[inset_0_0_0_1px_rgba(221,238,255,0.08)] after:content-[''] md:aspect-[16/10] lg:aspect-[16/8] xl:aspect-[16/12] 2xl:aspect-[16/10]">
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
            </div>
          </div>
        </div>
        <WatchedPerWeek />
        <div className="mt-20 grid grid-cols-1 gap-10 xl:grid-cols-2">
          <MostWatchedGenres />
          <MostWatchedProviders />
        </div>
      </div>
    </Page>
  );
}
