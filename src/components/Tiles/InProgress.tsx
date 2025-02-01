'use client';

import {
  memo,
  useCallback,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { toast } from 'sonner';

import useRgbString from '@/hooks/useRgbString';
import { type Season, type TvSeries } from '@/types/tv-series';

import ContextMenuButton, {
  type ContextMenuButtonHandle,
} from '../Buttons/ContextMenuButton';
import Progress from '../Progress/Progress';
import SpotlightBackground from '../Spotlight/SpotlightBackground';
import SpotlightTitle from '../Spotlight/SpotlightTitle';

function InProgress({
  currentSeason,
  currentSeasonWatchCount,
  tvSeries,
  removeAction,
  removeIsAllowed = false,
}: Readonly<{
  currentSeason: Season;
  currentSeasonWatchCount: number;
  tvSeries: TvSeries;
  removeAction: () => void;
  removeIsAllowed?: boolean;
}>) {
  const contextMenuButtonRef = useRef<ContextMenuButtonHandle>(null);
  const backdropColorRgbString = useRgbString(tvSeries.backdropColor);
  const [isRemoved, setIsRemoved] = useState(false);
  const [optimisticIsRemoved, setIsOptimisticRemoved] = useOptimistic(
    isRemoved,
    (_, optimisticValue: boolean) => optimisticValue,
  );
  const [isRemoving, startTransition] = useTransition();

  const handleRemove = useCallback(() => {
    contextMenuButtonRef.current?.close();

    startTransition(async () => {
      try {
        setIsOptimisticRemoved(true);
        await removeAction();
        setIsRemoved(true);
      } catch (_error) {
        toast.error(`Failed to remove item from 'In Progress'`);
      }
    });
  }, [removeAction, setIsOptimisticRemoved]);

  return (
    <AnimatePresence initial={false}>
      {!optimisticIsRemoved && (
        <motion.div
          key={`link-${tvSeries.id}`}
          className="relative origin-top-right overflow-hidden rounded-lg shadow-lg after:absolute after:inset-0 after:rounded after:shadow-[inset_0_0_0_1px_rgba(221,238,255,0.08)] after:content-['']"
          initial={{ opacity: 1, scale: 1 }}
          exit={{
            opacity: 0,
            scale: 0,
          }}
        >
          <Link
            className="relative z-10 flex aspect-[16/21] flex-shrink-0 items-end md:aspect-[16/14] lg:aspect-[16/8] xl:aspect-[16/15] 2xl:aspect-[16/12]"
            href={`/tv/${tvSeries.id}/${tvSeries.slug}?season=${currentSeason.seasonNumber}`}
            onClick={() => console.log('HOUDOE')}
          >
            {tvSeries.backdropImage && <SpotlightBackground item={tvSeries} />}

            <div className="flex w-full flex-col gap-5 p-6 md:gap-6 md:p-9">
              <SpotlightTitle item={tvSeries} size="small" />

              <div className="flex gap-4 whitespace-nowrap md:gap-12">
                <div className="flex w-full justify-center gap-2 text-xs opacity-60 md:justify-start md:text-[0.8rem]">
                  <div className="after:ml-2 after:content-['·']">
                    {tvSeries.releaseYear}
                  </div>
                  <div className="after:ml-2 after:content-['·']">
                    {tvSeries.numberOfSeasons}{' '}
                    {tvSeries.numberOfSeasons === 1 ? 'Season' : 'Seasons'}
                  </div>
                  <div>{tvSeries.genres[0]?.name}</div>
                </div>
              </div>
              <div className="relative flex cursor-default items-center gap-3 rounded-lg p-4 shadow-lg backdrop-blur md:flex-row md:items-center md:gap-10 md:p-6">
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
            {removeIsAllowed && (
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `linear-gradient(225deg, rgba(${backdropColorRgbString}, 1) 0%, rgba(${backdropColorRgbString}, 0) 30%)`,
                }}
              />
            )}
          </Link>
          {removeIsAllowed && (
            <ContextMenuButton
              ref={contextMenuButtonRef}
              size="small"
              className="!absolute !right-4 !top-4 !z-20"
            >
              <Link
                onClick={() => contextMenuButtonRef.current?.close()}
                href={`/track/${tvSeries.id}/${tvSeries.slug}?season=${currentSeason.seasonNumber}`}
                className="flex w-full flex-nowrap items-center gap-x-2 text-nowrap border-b-2 border-neutral-200 pb-3 text-sm font-medium hover:text-neutral-800"
              >
                <svg
                  fill="currentColor"
                  viewBox="0 0 512 512"
                  xmlns="http://www.w3.org/2000/svg"
                  className="size-5"
                >
                  <circle cx="256" cy="256" r="64" />
                  <path d="M394.82,141.18C351.1,111.2,304.31,96,255.76,96c-43.69,0-86.28,13-126.59,38.48C88.52,160.23,48.67,207,16,256c26.42,44,62.56,89.24,100.2,115.18C159.38,400.92,206.33,416,255.76,416c49,0,95.85-15.07,139.3-44.79C433.31,345,469.71,299.82,496,256,469.62,212.57,433.1,167.44,394.82,141.18ZM256,352a96,96,0,1,1,96-96A96.11,96.11,0,0,1,256,352Z" />
                </svg>
                <span>Edit watch history</span>
              </Link>
              <button
                onClick={handleRemove}
                disabled={isRemoving}
                className="flex w-full flex-nowrap items-center gap-x-2 text-nowrap text-sm font-medium hover:text-neutral-800"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 15 15"
                  className="size-5"
                  fill="currentColor"
                >
                  <path
                    d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
                    fillRule="evenodd"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Hide from in progress</span>
              </button>
            </ContextMenuButton>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default memo(InProgress);
