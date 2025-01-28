'use client';

import {
  memo,
  useCallback,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from 'react';

import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { type WatchedItem } from '@/lib/db/watched';
import { type Episode, type Season } from '@/types/tv-series';
import { type WatchProvider } from '@/types/watch-provider';
import formatDate from '@/utils/formatDate';
import formatRuntime from '@/utils/formatRuntime';
import formatSeasonAndEpisode from '@/utils/formatSeasonAndEpisode';

import Datepicker from '../Datepicker/Datepicker';

function EpisodeCard({
  episode,
  watchProvider,
  watchedItem,
}: Readonly<{
  episode: Episode;
  watchProvider?: WatchProvider | null;
  watchedItem?: Partial<WatchedItem> | null;
}>) {
  return (
    <div
      key={episode.id}
      className="flex items-center rounded-lg bg-black/25 p-4"
    >
      <div>
        <div className="flex gap-3">
          <span className="flex h-6 w-14 flex-shrink-0 items-center justify-center rounded-md bg-white/10 text-center text-xs font-medium">
            {formatSeasonAndEpisode({
              seasonNumber: episode.seasonNumber,
              episodeNumber: episode.episodeNumber,
            })}
          </span>
          {episode.title}
        </div>
        <div className="mt-3 flex w-full gap-1.5 text-xs font-medium">
          {episode.runtime && <div>{formatDate(episode.airDate)}</div>}
          <div className="opacity-60 before:mr-1 before:content-['—']">
            {formatRuntime(episode.runtime)}
          </div>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-4">
        <Datepicker
          className="flex h-8 cursor-pointer items-center gap-1 text-nowrap rounded-md border border-white/5 bg-black/5 px-2 text-center text-xs text-white/75"
          offset={{
            x: 0,
            y: 30,
          }}
          selected={watchedItem ? new Date(watchedItem.watchedAt!) : undefined}
          onSelect={(value) => console.log({ value })}
        >
          {watchedItem ? (
            <>
              <span>Watched on</span>
              <span className="font-semibold">
                {formatDate(new Date(watchedItem.watchedAt!).toISOString())}
              </span>
              <svg
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('clear watched date');
                }}
                className="ml-0.5 size-4"
                fill="currentColor"
                viewBox="0 0 32 32"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M7.004 23.087l7.08-7.081-7.07-7.071L8.929 7.02l7.067 7.069L23.084 7l1.912 1.913-7.089 7.093 7.075 7.077-1.912 1.913-7.074-7.073L8.917 25z" />
              </svg>
            </>
          ) : (
            <span>Select watch date</span>
          )}
        </Datepicker>
        <Image
          className="rounded"
          src={watchProvider?.logo || ''}
          alt={watchProvider?.name || ''}
          width={28}
          height={28}
          unoptimized
        />
      </div>
    </div>
  );
}

function SeasonCard_({
  season,
  watchProvider,
  watchedItems,
  updateItems,
}: Readonly<{
  season: Season;
  watchProvider?: WatchProvider | null;
  watchedItems: Partial<WatchedItem>[];
  updateItems: (action: WatchedAction) => void;
}>) {
  const ref = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const watchedForSeason = watchedItems.filter(
    (item) => item.seasonNumber === season.seasonNumber,
  );
  const lastWatched = watchedForSeason[watchedForSeason.length - 1];
  const isFinished = season.numberOfAiredEpisodes === watchedForSeason.length;

  return (
    <div className="rounded-lg bg-white/5 p-6">
      <div
        ref={ref}
        className="relative w-full cursor-pointer"
        onClick={(e) => {
          const fromWithin =
            ref.current?.contains(e.target as Node) && e.target !== ref.current;
          if (fromWithin) {
            setIsExpanded((prev) => !prev);
          }
        }}
      >
        <div className="flex items-center">
          <h2 className="text-lg font-medium">{season.title}</h2>
          <div className="ml-auto flex items-center gap-4">
            <Datepicker
              className="flex h-9 cursor-pointer items-center gap-1 text-nowrap rounded-md border border-white/10 bg-black/20 px-2.5 text-center text-sm text-white/75"
              offset={{
                x: 0,
                y: 30,
              }}
              selected={
                lastWatched ? new Date(lastWatched.watchedAt!) : undefined
              }
              onSelect={(value) => {
                updateItems({
                  type: 'update',
                  items: season.episodes.map((episode) => ({
                    episodeNumber: episode.episodeNumber,
                    runtime: episode.runtime,
                    seasonNumber: episode.seasonNumber,
                    watchedAt: new Date(value).getTime(),
                  })),
                });
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {lastWatched ? (
                <>
                  <span>{isFinished ? 'Finished' : 'Last watched'} on</span>
                  <span className="font-semibold">
                    {formatDate(new Date(lastWatched.watchedAt!).toISOString())}
                  </span>
                  <svg
                    onClick={(e) => {
                      e.stopPropagation();

                      updateItems({
                        type: 'delete',
                        items: watchedForSeason,
                      });
                    }}
                    className="ml-1 size-5"
                    fill="currentColor"
                    viewBox="0 0 32 32"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M7.004 23.087l7.08-7.081-7.07-7.071L8.929 7.02l7.067 7.069L23.084 7l1.912 1.913-7.089 7.093 7.075 7.077-1.912 1.913-7.074-7.073L8.917 25z" />
                  </svg>
                </>
              ) : (
                <span>Select watch date</span>
              )}
            </Datepicker>
            <motion.svg
              className="size-6"
              viewBox="0 0 20 20"
              fill="currentColor"
              animate={{
                rotate: isExpanded ? 180 : 0,
              }}
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </motion.svg>
          </div>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key={season.id}
            initial="collapsed"
            animate="open"
            exit="collapsed"
            variants={{
              open: { opacity: 1, height: 'auto', scale: 1 },
              collapsed: { opacity: 0, height: 0, scale: 0.96 },
            }}
            transition={{ duration: 0.6, ease: [0.04, 0.62, 0.23, 0.98] }}
          >
            <div className="flex flex-col gap-2 pt-6">
              {season.episodes.map((episode) => (
                <EpisodeCard
                  key={episode.id}
                  episode={episode}
                  watchProvider={watchProvider}
                  watchedItem={watchedForSeason.find(
                    (item) => item.episodeNumber === episode.episodeNumber,
                  )}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const SeasonCard = memo(SeasonCard_);

type WatchedAction = Readonly<{
  type: 'delete' | 'update';
  items: Partial<WatchedItem>[];
}>;

function TrackForm({
  seasons,
  watchProvider,
  watchedItems,
  deleteAction,
  saveAction,
}: Readonly<{
  seasons: Season[];
  watchProvider?: WatchProvider | null;
  watchedItems: WatchedItem[];
  deleteAction: (items: Partial<WatchedItem>[]) => void;
  saveAction: (items: Partial<WatchedItem>[]) => void;
}>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticWatchedItems, setOptimisticWatchedItems] = useOptimistic<
    Partial<WatchedItem>[],
    WatchedAction
  >(watchedItems, (state, { type, items }) => {
    switch (type) {
      case 'delete': {
        const updatedState = state.filter(
          (item) =>
            !items.some(
              (watchedItem) =>
                item.episodeNumber === watchedItem.episodeNumber &&
                item.seasonNumber === watchedItem.seasonNumber,
            ),
        );

        return updatedState;
      }
      case 'update':
      default: {
        const updatedState = [...state];

        items.forEach((watchedItem) => {
          const existingIndex = updatedState.findIndex(
            (item) =>
              item.episodeNumber === watchedItem.episodeNumber &&
              item.seasonNumber === watchedItem.seasonNumber,
          );

          if (existingIndex !== -1) {
            updatedState[existingIndex] = {
              ...updatedState[existingIndex],
              ...watchedItem,
            };
          } else {
            updatedState.push(watchedItem);
          }
        });

        return updatedState;
      }
    }
  });

  const updateItems = useCallback(
    ({ type, items }: WatchedAction) => {
      startTransition(async () => {
        setOptimisticWatchedItems({ type, items });

        try {
          await (type === 'delete' ? deleteAction(items) : saveAction(items));
          router.refresh();
        } catch (_) {
          toast.error('Something went wrong. Please try again.');
        }
      });
    },
    [deleteAction, router, saveAction, setOptimisticWatchedItems],
  );

  return (
    <div className="flex flex-col gap-4">
      {seasons.map((season) => (
        <SeasonCard
          key={season.id}
          season={season}
          watchedItems={optimisticWatchedItems.filter(
            (item) => item.seasonNumber === season.seasonNumber,
          )}
          watchProvider={watchProvider}
          updateItems={updateItems}
        />
      ))}
    </div>
  );
}

export default memo(TrackForm);
