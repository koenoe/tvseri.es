'use client';

import type { Season, WatchedItem, WatchProvider } from '@tvseri.es/schemas';
import { AnimatePresence, motion } from 'motion/react';
import { memo, useCallback, useMemo, useRef, useState } from 'react';

import formatDate from '@/utils/formatDate';
import Datepicker from '../Datepicker/DatepickerLazy';
import type { WatchedAction } from './Cards';
import EpisodeCard from './EpisodeCard';

const stopPropagation = (event: React.MouseEvent) => {
  event.stopPropagation();
};

function SeasonCard({
  isExpanded: isExpandedFromProps = false,
  season,
  watchProvider,
  watchedItems,
  updateItems,
}: Readonly<{
  isExpanded?: boolean;
  season: Season;
  watchProvider?: WatchProvider | null;
  watchedItems: Partial<WatchedItem>[];
  updateItems: (action: WatchedAction) => void;
}>) {
  const ref = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(isExpandedFromProps);
  const watchedForSeason = useMemo(
    () =>
      watchedItems
        .filter((item) => item.seasonNumber === season.seasonNumber)
        .sort((a, b) => a.watchedAt! - b.watchedAt!),
    [season.seasonNumber, watchedItems],
  );
  const lastWatched = watchedForSeason[watchedForSeason.length - 1];
  const numberOfAiredEpisodes = season.numberOfAiredEpisodes ?? 0;
  const isFinished =
    numberOfAiredEpisodes > 0 &&
    watchedForSeason.length >= numberOfAiredEpisodes;
  const episodes = useMemo(
    () => season.episodes.filter((episode) => episode.hasAired),
    [season.episodes],
  );

  const handleContainerClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const fromWithin =
        ref.current?.contains(event.target as Node) &&
        event.target !== ref.current;
      if (fromWithin) {
        setIsExpanded((prev) => !prev);
      }
    },
    [],
  );

  const handleJustFinished = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      updateItems({
        items: episodes.map((episode) => ({
          episodeAirDate: episode.airDate,
          episodeNumber: episode.episodeNumber,
          episodeStillPath: episode.stillPath,
          episodeTitle: episode.title,
          runtime: episode.runtime,
          seasonNumber: episode.seasonNumber,
          watchedAt: Date.now(),
        })),
        type: 'update',
      });
    },
    [episodes, updateItems],
  );

  const handleReleaseDate = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      updateItems({
        items: episodes.map((episode) => ({
          episodeAirDate: episode.airDate,
          episodeNumber: episode.episodeNumber,
          episodeStillPath: episode.stillPath,
          episodeTitle: episode.title,
          runtime: episode.runtime,
          seasonNumber: episode.seasonNumber,
          watchedAt: new Date(episode.airDate).getTime(),
        })),
        type: 'update',
      });
    },
    [episodes, updateItems],
  );

  const handleSelectDate = useCallback(
    (value: string) => {
      updateItems({
        items: episodes.map((episode) => ({
          episodeAirDate: episode.airDate,
          episodeNumber: episode.episodeNumber,
          episodeStillPath: episode.stillPath,
          episodeTitle: episode.title,
          runtime: episode.runtime,
          seasonNumber: episode.seasonNumber,
          watchedAt: new Date(value).getTime(),
        })),
        type: 'update',
      });
    },
    [episodes, updateItems],
  );

  const handleDelete = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      event.stopPropagation();
      updateItems({
        items: watchedForSeason,
        type: 'delete',
      });
    },
    [updateItems, watchedForSeason],
  );

  return (
    <div className="rounded-xl bg-neutral-800 p-6">
      <div
        className="relative w-full cursor-pointer"
        onClick={handleContainerClick}
        ref={ref}
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <h2 className="w-full text-lg font-medium">{season.title}</h2>
          <div className="flex items-center gap-4 md:ml-auto">
            <Datepicker
              className="flex h-9 w-full cursor-pointer items-center gap-1 text-nowrap rounded-lg border border-white/10 bg-black/10 px-2.5 text-center text-sm text-white/75 md:w-auto"
              footer={
                <div className="mt-4 flex gap-3">
                  <button
                    className="flex w-1/2 items-center justify-center text-nowrap rounded-xl bg-white/5 p-3 text-xs tracking-wide hover:bg-white/10"
                    onClick={handleJustFinished}
                  >
                    Just finished
                  </button>
                  <button
                    className="flex w-1/2 items-center justify-center text-nowrap rounded-xl bg-white/5 p-3 text-xs tracking-wide hover:bg-white/10"
                    onClick={handleReleaseDate}
                  >
                    Release date
                  </button>
                </div>
              }
              offset={{
                x: 0,
                y: 30,
              }}
              onClick={stopPropagation}
              onSelect={handleSelectDate}
              selected={
                lastWatched ? new Date(lastWatched.watchedAt!) : undefined
              }
            >
              {lastWatched ? (
                <>
                  <span>{isFinished ? 'Finished' : 'Last watched'} on</span>
                  <span className="font-semibold">
                    {formatDate(new Date(lastWatched.watchedAt!).toISOString())}
                  </span>
                  <svg
                    className="ml-auto size-4 md:ml-1"
                    fill="currentColor"
                    onClick={handleDelete}
                    viewBox="0 0 32 32"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M7.004 23.087l7.08-7.081-7.07-7.071L8.929 7.02l7.067 7.069L23.084 7l1.912 1.913-7.089 7.093 7.075 7.077-1.912 1.913-7.074-7.073L8.917 25z" />
                  </svg>
                </>
              ) : (
                <>
                  <span>Select watch date</span>
                  <svg
                    className="ml-auto size-4 md:ml-1"
                    fill="none"
                    viewBox="0 0 15 15"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      clipRule="evenodd"
                      d="M4.93179 5.43179C4.75605 5.60753 4.75605 5.89245 4.93179 6.06819C5.10753 6.24392 5.39245 6.24392 5.56819 6.06819L7.49999 4.13638L9.43179 6.06819C9.60753 6.24392 9.89245 6.24392 10.0682 6.06819C10.2439 5.89245 10.2439 5.60753 10.0682 5.43179L7.81819 3.18179C7.73379 3.0974 7.61933 3.04999 7.49999 3.04999C7.38064 3.04999 7.26618 3.0974 7.18179 3.18179L4.93179 5.43179ZM10.0682 9.56819C10.2439 9.39245 10.2439 9.10753 10.0682 8.93179C9.89245 8.75606 9.60753 8.75606 9.43179 8.93179L7.49999 10.8636L5.56819 8.93179C5.39245 8.75606 5.10753 8.75606 4.93179 8.93179C4.75605 9.10753 4.75605 9.39245 4.93179 9.56819L7.18179 11.8182C7.35753 11.9939 7.64245 11.9939 7.81819 11.8182L10.0682 9.56819Z"
                      fill="currentColor"
                      fillRule="evenodd"
                    />
                  </svg>
                </>
              )}
            </Datepicker>
            <motion.svg
              animate={{
                rotate: isExpanded ? 180 : 0,
              }}
              className="absolute right-0 top-0 size-6 md:relative md:right-auto md:top-auto"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                clipRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                fillRule="evenodd"
              />
            </motion.svg>
          </div>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {isExpanded ? (
          <motion.div
            animate="open"
            exit="collapsed"
            initial="collapsed"
            key={season.id}
            transition={{ duration: 0.6, ease: [0.04, 0.62, 0.23, 0.98] }}
            variants={{
              collapsed: { height: 0, opacity: 0, scale: 0.96 },
              open: { height: 'auto', opacity: 1, scale: 1 },
            }}
          >
            <div className="flex flex-col gap-2 pt-6">
              {episodes.map((episode) => (
                <EpisodeCard
                  episode={episode}
                  key={episode.id}
                  updateItems={updateItems}
                  watchedItem={watchedForSeason.find(
                    (item) => item.episodeNumber === episode.episodeNumber,
                  )}
                  watchProvider={watchProvider}
                />
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default memo(SeasonCard);
