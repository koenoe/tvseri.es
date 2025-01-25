'use client';

import { memo, useCallback, useRef, useState, useTransition } from 'react';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { twMerge } from 'tailwind-merge';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/Table';
import { type WatchedItem } from '@/lib/db/watched';
import { type Episode } from '@/types/tv-series';
import { type WatchProvider } from '@/types/watch-provider';
import formatDate from '@/utils/formatDate';
import formatRuntime from '@/utils/formatRuntime';
import formatSeasonAndEpisode from '@/utils/formatSeasonAndEpisode';

import Datepicker from '../Datepicker/Datepicker';
import LoadingDots from '../LoadingDots/LoadingDots';

type CheckableWatchedItem = Partial<WatchedItem> &
  Readonly<{
    isChecked: boolean;
  }>;

function EpisodeRow({
  episode,
  item,
  isWatched,
  onToggle,
  onUpdate,
  watchProvider,
}: Readonly<{
  episode: Episode;
  item: CheckableWatchedItem;
  isWatched: boolean;
  onToggle: (item: Partial<WatchedItem>) => void;
  onUpdate: (item: Partial<WatchedItem>) => void;
  watchProvider?: WatchProvider | null;
}>) {
  const ref = useRef<HTMLTableRowElement>(null);
  const handleDateSelect = useCallback(
    (dateStr: string) => {
      onUpdate({
        ...item,
        seasonNumber: episode.seasonNumber,
        episodeNumber: episode.episodeNumber,
        watchedAt: new Date(dateStr).getTime(),
        watchProviderName: watchProvider?.name,
        watchProviderLogoImage: watchProvider?.logo,
        watchProviderLogoPath: watchProvider?.logoPath,
      });
    },
    [
      episode.episodeNumber,
      episode.seasonNumber,
      item,
      onUpdate,
      watchProvider?.logo,
      watchProvider?.logoPath,
      watchProvider?.name,
    ],
  );

  return (
    <TableRow
      ref={ref}
      onClick={(e) => {
        const fromWithin =
          ref.current?.contains(e.target as Node) && e.target !== ref.current;
        if (fromWithin) {
          onToggle({
            seasonNumber: episode.seasonNumber,
            episodeNumber: episode.episodeNumber,
            watchedAt: item.watchedAt || Date.now(),
            watchProviderName: watchProvider?.name,
            watchProviderLogoImage: watchProvider?.logo,
            watchProviderLogoPath: watchProvider?.logoPath,
          });
        }
      }}
    >
      <TableCell>
        <input
          type="checkbox"
          checked={item.isChecked}
          onChange={() =>
            onToggle({
              seasonNumber: episode.seasonNumber,
              episodeNumber: episode.episodeNumber,
              watchedAt: item.watchedAt || Date.now(),
              watchProviderName: watchProvider?.name,
              watchProviderLogoImage: watchProvider?.logo,
              watchProviderLogoPath: watchProvider?.logoPath,
            })
          }
          onClick={(e) => e.stopPropagation()}
        />
      </TableCell>
      <TableCell>
        <div className="flex min-h-3 flex-nowrap items-center gap-3 text-nowrap leading-relaxed">
          <span className="flex h-6 w-14 flex-shrink-0 items-center justify-center rounded-md bg-neutral-700 text-center text-xs font-medium">
            {formatSeasonAndEpisode({
              seasonNumber: episode.seasonNumber,
              episodeNumber: episode.episodeNumber,
            })}
          </span>
          {episode.title}
        </div>
      </TableCell>
      <TableCell>
        <span className="text-nowrap">{formatDate(episode.airDate)}</span>
      </TableCell>
      <TableCell>{formatRuntime(episode.runtime)}</TableCell>
      <TableCell>
        <div className="flex flex-nowrap items-center gap-2">
          <Datepicker
            className="w-24 flex-shrink-0 cursor-pointer text-nowrap rounded-md border border-neutral-700 bg-neutral-800 px-1.5 py-1 text-center text-xs text-neutral-400"
            offset={{
              x: 0,
              y: 30,
            }}
            onSelect={handleDateSelect}
            onClick={(e) => e.stopPropagation()}
          >
            {formatDate(new Date(item.watchedAt || Date.now()).toISOString())}
          </Datepicker>
          {isWatched && (
            <svg
              fill="currentColor"
              viewBox="0 0 512 512"
              xmlns="http://www.w3.org/2000/svg"
              className="ml-2 mr-2 size-4"
            >
              <circle cx="256" cy="256" r="64" />
              <path d="M394.82,141.18C351.1,111.2,304.31,96,255.76,96c-43.69,0-86.28,13-126.59,38.48C88.52,160.23,48.67,207,16,256c26.42,44,62.56,89.24,100.2,115.18C159.38,400.92,206.33,416,255.76,416c49,0,95.85-15.07,139.3-44.79C433.31,345,469.71,299.82,496,256,469.62,212.57,433.1,167.44,394.82,141.18ZM256,352a96,96,0,1,1,96-96A96.11,96.11,0,0,1,256,352Z" />
            </svg>
          )}
        </div>
      </TableCell>
      <TableCell>
        {(item.watchProviderName || watchProvider?.name) &&
          (item.watchProviderLogoImage || watchProvider?.logo) && (
            <div className="flex flex-nowrap items-center gap-x-3">
              <Image
                className="rounded"
                src={item.watchProviderLogoImage || watchProvider?.logo || ''}
                alt={item.watchProviderName || watchProvider?.name || ''}
                width={24}
                height={24}
                unoptimized
              />
              <span className="truncate text-ellipsis text-xs text-white">
                {item.watchProviderName || watchProvider?.name}
              </span>
            </div>
          )}
      </TableCell>
    </TableRow>
  );
}

function Episodes({
  episodes,
  watched,
  watchProvider,
  saveAction,
  deleteAction,
}: Readonly<{
  episodes: Episode[];
  watched: WatchedItem[];
  watchProvider?: WatchProvider | null;
  saveAction: (items: Partial<WatchedItem>[]) => void;
  deleteAction: (items: Partial<WatchedItem>[]) => void;
}>) {
  const router = useRouter();
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [isSavePending, startSaveTransition] = useTransition();
  const [items, setItems] = useState<CheckableWatchedItem[]>(() =>
    episodes.map((episode) => {
      const watchedItem = watched.find(
        (w) =>
          w.seasonNumber === episode.seasonNumber &&
          w.episodeNumber === episode.episodeNumber,
      );

      return {
        seasonNumber: episode.seasonNumber,
        episodeNumber: episode.episodeNumber,
        watchedAt: watchedItem?.watchedAt || Date.now(),
        watchProviderName:
          watchedItem?.watchProviderName || watchProvider?.name,
        watchProviderLogoImage:
          watchedItem?.watchProviderLogoImage || watchProvider?.logo,
        watchProviderLogoPath:
          watchedItem?.watchProviderLogoPath || watchProvider?.logoPath,
        isChecked: !watchedItem,
      };
    }),
  );

  const getPayloadForAction = useCallback(() => {
    return items
      .filter((i) => i.isChecked)
      .map((item) => {
        const episode = episodes.find(
          (e) =>
            e.seasonNumber === item.seasonNumber &&
            e.episodeNumber === item.episodeNumber,
        )!;

        return {
          episodeNumber: episode.episodeNumber,
          runtime: episode.runtime,
          seasonNumber: episode.seasonNumber,
          watchedAt: item.watchedAt,
        };
      });
  }, [episodes, items]);

  const handleToggle = useCallback((watchedItem: Partial<WatchedItem>) => {
    setItems((prev) =>
      prev.map((item) =>
        item.seasonNumber === watchedItem.seasonNumber &&
        item.episodeNumber === watchedItem.episodeNumber
          ? { ...item, isChecked: !item.isChecked }
          : item,
      ),
    );
  }, []);

  const handleUpdate = useCallback((watchedItem: Partial<WatchedItem>) => {
    setItems((prev) =>
      prev.map((item) =>
        item.seasonNumber === watchedItem.seasonNumber &&
        item.episodeNumber === watchedItem.episodeNumber
          ? { ...watchedItem, isChecked: true }
          : item,
      ),
    );
  }, []);

  const handleCheckAll = useCallback(() => {
    const allChecked = items.every((item) => item.isChecked);
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        isChecked: !allChecked,
      })),
    );
  }, [items]);

  const handleSave = useCallback(() => {
    startSaveTransition(async () => {
      try {
        await saveAction(getPayloadForAction());
        router.refresh();
      } catch (_) {
        toast.error('Something went wrong. Please try again later.');
      }
    });
  }, [getPayloadForAction, router, saveAction]);

  const handleDelete = useCallback(() => {
    startDeleteTransition(async () => {
      try {
        await deleteAction(getPayloadForAction());
        router.refresh();
      } catch (_) {
        toast.error('Something went wrong. Please try again later.');
      }
    });
  }, [deleteAction, getPayloadForAction, router]);

  const showDeleteButton = watched.length > 0;
  const disableActionButtons = !items.some((i) => i.isChecked);
  const disableSaveButton = disableActionButtons;
  const disableDeleteButton = showDeleteButton && disableActionButtons;

  return (
    <>
      <Table className="max-h-[calc(100vh-24rem)] text-xs md:max-h-[calc(100vh-33rem)]">
        <TableHeader className="sticky top-0 z-10 border-b">
          <TableRow>
            <TableHead className="w-10">
              <input
                type="checkbox"
                checked={items.every((item) => item.isChecked)}
                onChange={handleCheckAll}
              />
            </TableHead>
            <TableHead>Episode</TableHead>
            <TableHead className="w-40">Air date</TableHead>
            <TableHead className="w-24">Runtime</TableHead>
            <TableHead className="w-40">
              <Datepicker
                className="relative w-full"
                offset={{
                  x: 0,
                  y: 46,
                }}
                onSelect={(selected) => {
                  setItems((prev) =>
                    prev.map((item) => ({
                      ...item,
                      isChecked: true,
                      watchedAt: new Date(selected).getTime(),
                    })),
                  );
                }}
              >
                <span className="block w-full min-w-32 cursor-pointer appearance-none rounded-md border border-neutral-800 bg-neutral-900 py-2 pl-3 pr-6 text-left outline-none">
                  {watched.length > 0 ? 'Watched on' : 'Watch date'}
                </span>
                <svg
                  viewBox="0 0 15 15"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="pointer-events-none absolute right-2 top-1/2 size-4 shrink-0 -translate-y-1/2 text-white/40"
                >
                  <path
                    d="M4.93179 5.43179C4.75605 5.60753 4.75605 5.89245 4.93179 6.06819C5.10753 6.24392 5.39245 6.24392 5.56819 6.06819L7.49999 4.13638L9.43179 6.06819C9.60753 6.24392 9.89245 6.24392 10.0682 6.06819C10.2439 5.89245 10.2439 5.60753 10.0682 5.43179L7.81819 3.18179C7.73379 3.0974 7.61933 3.04999 7.49999 3.04999C7.38064 3.04999 7.26618 3.0974 7.18179 3.18179L4.93179 5.43179ZM10.0682 9.56819C10.2439 9.39245 10.2439 9.10753 10.0682 8.93179C9.89245 8.75606 9.60753 8.75606 9.43179 8.93179L7.49999 10.8636L5.56819 8.93179C5.39245 8.75606 5.10753 8.75606 4.93179 8.93179C4.75605 9.10753 4.75605 9.39245 4.93179 9.56819L7.18179 11.8182C7.35753 11.9939 7.64245 11.9939 7.81819 11.8182L10.0682 9.56819Z"
                    fill="currentColor"
                    fillRule="evenodd"
                    clipRule="evenodd"
                  />
                </svg>
              </Datepicker>
            </TableHead>
            <TableHead className="w-56">Streaming service</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {episodes.map((episode) => {
            const item = items.find(
              (i) =>
                i.seasonNumber === episode.seasonNumber &&
                i.episodeNumber === episode.episodeNumber,
            )!;

            return (
              <EpisodeRow
                key={episode.id}
                episode={episode}
                item={item}
                isWatched={watched.some(
                  (i) =>
                    i.seasonNumber === episode.seasonNumber &&
                    i.episodeNumber === episode.episodeNumber,
                )}
                onToggle={handleToggle}
                onUpdate={handleUpdate}
                watchProvider={watchProvider}
              />
            );
          })}
        </TableBody>
      </Table>
      <div className="mt-6 flex w-full flex-col items-center gap-4 md:mt-10 md:flex-row">
        <div className="mb-2 items-baseline text-sm text-white/60 md:mb-0">
          <span className="rounded bg-white/10 px-2 py-1 font-medium text-white">
            {items.filter((i) => i.isChecked).length.toLocaleString()}/
            {episodes.length.toLocaleString()}
          </span>
          <span className="ml-2">episodes</span>
        </div>
        <button
          onClick={() => router.back()}
          className="flex h-11 w-full min-w-24 cursor-pointer items-center justify-center rounded-3xl bg-white/5 px-5 text-sm leading-none tracking-wide hover:bg-white/10 md:ml-auto md:w-auto"
        >
          <span>Back</span>
        </button>
        {showDeleteButton && (
          <button
            onClick={handleDelete}
            className={twMerge(
              'flex h-11 w-full min-w-24 cursor-pointer items-center justify-center rounded-3xl bg-red-500 px-5 text-sm leading-none tracking-wide text-white md:w-auto',
              disableDeleteButton && 'cursor-not-allowed opacity-40',
            )}
            disabled={disableDeleteButton || isDeletePending}
          >
            {isDeletePending ? (
              <LoadingDots className="h-2 text-white" />
            ) : (
              'Delete'
            )}
          </button>
        )}

        <button
          onClick={handleSave}
          className={twMerge(
            'flex h-11 w-full min-w-24 cursor-pointer items-center justify-center rounded-3xl bg-white px-5 text-sm leading-none tracking-wide text-neutral-900 md:w-auto',
            disableSaveButton && 'cursor-not-allowed opacity-40',
          )}
          disabled={disableSaveButton || isSavePending}
        >
          {isSavePending ? (
            <LoadingDots className="h-2 text-neutral-900" />
          ) : (
            'Save'
          )}
        </button>
      </div>
    </>
  );
}

export default memo(Episodes);
