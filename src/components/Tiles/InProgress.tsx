'use client';

import { memo } from 'react';

import { motion } from 'framer-motion';
import Link from 'next/link';

import { type Season, type TvSeries } from '@/types/tv-series';

import Progress from '../Progress/Progress';
import SpotlightBackground from '../Spotlight/SpotlightBackground';
import SpotlightTitle from '../Spotlight/SpotlightTitle';

function InProgress({
  currentSeason,
  currentSeasonWatchCount,
  totalWatchCount,
  tvSeries,
}: Readonly<{
  currentSeason: Season;
  currentSeasonWatchCount: number;
  totalWatchCount: number;
  tvSeries: TvSeries;
}>) {
  return (
    <div
      className="relative overflow-hidden rounded-lg border border-white/10 p-4 shadow-lg md:p-6"
      style={{
        backgroundColor: tvSeries.backdropColor,
      }}
    >
      <>
        <motion.button
          className="absolute right-2 top-2 z-10 flex size-8 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur md:right-4 md:top-4"
          onClick={(e) => {
            e.preventDefault();
            console.log('remove');
          }}
          whileTap="tap"
          whileHover="hover"
          initial={false}
          animate="inactive"
          variants={{
            active: {
              borderColor: 'rgba(255, 255, 255, 1)',
              color: 'rgba(255, 255, 255, 1)',
              transition: {
                duration: 0.6,
              },
            },
            inactive: {
              borderColor: 'rgba(255, 255, 255, 0.2)',
              color: 'rgba(255, 255, 255, 0.6)',
            },
            hover: {
              borderColor: 'rgba(255, 255, 255, 0.4)',
            },
          }}
        >
          <motion.svg
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            className="size-2.5"
            fill="currentColor"
            variants={{
              tap: { scale: 0.6 },
            }}
          >
            <path d="m24 2.4-2.4-2.4-9.6 9.6-9.6-9.6-2.4 2.4 9.6 9.6-9.6 9.6 2.4 2.4 9.6-9.6 9.6 9.6 2.4-2.4-9.6-9.6z" />
          </motion.svg>
        </motion.button>
      </>
      <Link
        href={`/tv/${tvSeries.id}/${tvSeries.slug}`}
        className="relative flex aspect-[16/18] flex-shrink-0 items-end overflow-hidden rounded-lg shadow-lg after:absolute after:inset-0 after:rounded after:shadow-[inset_0_0_0_1px_rgba(221,238,255,0.08)] after:content-[''] md:aspect-[16/14] lg:aspect-[16/8] xl:aspect-[16/12]"
      >
        {tvSeries.backdropImage && <SpotlightBackground item={tvSeries} />}

        <div className="flex w-full flex-col gap-4 p-4 md:gap-6 md:p-9 xl:p-12">
          <SpotlightTitle item={tvSeries} size="small" />

          <div className="flex gap-4 whitespace-nowrap md:gap-12">
            <div className="flex w-full justify-center gap-2 text-xs opacity-60 md:justify-start md:text-[0.8rem]">
              <div className="after:ml-2 after:content-['·']">
                {tvSeries.releaseYear}
              </div>
              <div>
                {tvSeries.numberOfSeasons}{' '}
                {tvSeries.numberOfSeasons === 1 ? 'Season' : 'Seasons'}
              </div>
            </div>
          </div>
          <Progress
            numberOfEpisodes={
              tvSeries.numberOfAiredEpisodes || tvSeries.numberOfEpisodes || 0
            }
            numberOfWatched={totalWatchCount}
          />
        </div>
      </Link>
      <div className="mt-4">
        <div className="flex cursor-default items-center gap-3 rounded-lg bg-white/5 p-4 md:flex-row md:items-center md:gap-10 md:p-6">
          <h2 className="flex-nowrap text-ellipsis text-nowrap text-sm font-medium md:w-auto md:text-lg">
            <span className="hidden sm:inline-block">
              {currentSeason.title}
            </span>
            <span className="sm:hidden">
              S{currentSeason.seasonNumber.toString().padStart(2, '0')}
            </span>
          </h2>
          <Progress
            className="h-7"
            numberOfEpisodes={
              currentSeason.numberOfAiredEpisodes ||
              currentSeason.numberOfEpisodes ||
              0
            }
            numberOfWatched={currentSeasonWatchCount}
          />
        </div>
      </div>
    </div>
  );
}

export default memo(InProgress);
