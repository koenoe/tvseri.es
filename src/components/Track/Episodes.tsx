'use client';

import { memo, useCallback, useState } from 'react';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
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

function EpisodeRow({
  episode,
  isChecked,
  item,
  onToggle,
  watchProvider,
}: Readonly<{
  episode: Episode;
  isChecked: boolean;
  item?: Partial<WatchedItem>;
  onToggle: (episode: Episode) => void;
  watchProvider?: WatchProvider | null;
}>) {
  const [watchedAt, setWatchedAt] = useState<Date>(
    item?.watchedAt ? new Date(item.watchedAt) : new Date(),
  );
  const watchProviderName = item?.watchProviderName || watchProvider?.name;
  const watchProviderLogoImage =
    item?.watchProviderLogoImage || watchProvider?.logo;

  return (
    <TableRow
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest('button')) {
          onToggle(episode);
        }
      }}
    >
      <TableCell>
        <input
          type="checkbox"
          checked={isChecked}
          onChange={() => onToggle(episode)}
          onClick={(e) => e.stopPropagation()}
        />
      </TableCell>
      <TableCell>
        <div className="flex min-h-3 flex-nowrap gap-3 text-nowrap leading-relaxed">
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
        <Datepicker
          className="inline cursor-pointer text-nowrap rounded-md border border-neutral-700 bg-neutral-800 px-1.5 py-1 text-center text-xs text-neutral-400"
          offset={{
            x: 0,
            y: 30,
          }}
          onSelect={(selected) =>
            setWatchedAt(selected ? new Date(selected) : new Date())
          }
          onClick={(e) => {
            if (item) {
              e.stopPropagation();
              console.log('click watched on:', item);
            }
          }}
        >
          {formatDate(watchedAt.toISOString())}
        </Datepicker>
      </TableCell>
      <TableCell>
        {watchProviderName && watchProviderLogoImage && (
          <div className="flex flex-nowrap items-center gap-x-3">
            <Image
              className="rounded"
              src={watchProviderLogoImage}
              alt={watchProviderName}
              width={24}
              height={24}
              unoptimized
            />
            <span className="truncate text-ellipsis text-xs text-white">
              {watchProviderName}
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
}: Readonly<{
  episodes: Episode[];
  watched: WatchedItem[];
  watchProvider?: WatchProvider | null;
}>) {
  const router = useRouter();
  const [checkedItems, setCheckedItems] = useState<Partial<WatchedItem>[]>(
    () => {
      const unwatchedEpisodes = episodes.filter(
        (episode) =>
          !watched.some(
            (item) =>
              item.seasonNumber === episode.seasonNumber &&
              item.episodeNumber === episode.episodeNumber,
          ),
      );
      return unwatchedEpisodes.map((episode) => ({
        seasonNumber: episode.seasonNumber,
        episodeNumber: episode.episodeNumber,
        watchedAt: Date.now(),
      }));
    },
  );

  const handleToggle = useCallback((episode: Episode) => {
    setCheckedItems((prev) => {
      const isChecked = prev.some(
        (item) =>
          item.seasonNumber === episode.seasonNumber &&
          item.episodeNumber === episode.episodeNumber,
      );

      if (isChecked) {
        return prev.filter(
          (item) =>
            item.seasonNumber !== episode.seasonNumber ||
            item.episodeNumber !== episode.episodeNumber,
        );
      } else {
        return [
          ...prev,
          {
            seasonNumber: episode.seasonNumber,
            episodeNumber: episode.episodeNumber,
            watchedAt: Date.now(),
          },
        ];
      }
    });
  }, []);

  const handleCheckAll = useCallback(() => {
    const allChecked = episodes.every((episode) =>
      checkedItems.some(
        (item) =>
          item.seasonNumber === episode.seasonNumber &&
          item.episodeNumber === episode.episodeNumber,
      ),
    );

    if (allChecked) {
      setCheckedItems([]);
    } else {
      setCheckedItems(
        episodes.map((episode) => ({
          seasonNumber: episode.seasonNumber,
          episodeNumber: episode.episodeNumber,
          watchedAt: Date.now(),
          watchProviderName: watchProvider?.name,
          watchProviderLogoImage: watchProvider?.logo,
          watchProviderLogoPath: watchProvider?.logoPath,
        })),
      );
    }
  }, [
    checkedItems,
    episodes,
    watchProvider?.logo,
    watchProvider?.logoPath,
    watchProvider?.name,
  ]);

  return (
    <>
      <Table className="max-h-[calc(100vh-24rem)] text-xs md:max-h-[calc(100vh-33rem)]">
        <TableHeader className="sticky top-0 z-10 border-b">
          <TableRow>
            <TableHead className="w-10">
              <input
                type="checkbox"
                checked={episodes.every((episode) =>
                  checkedItems.some(
                    (item) =>
                      item.seasonNumber === episode.seasonNumber &&
                      item.episodeNumber === episode.episodeNumber,
                  ),
                )}
                onChange={handleCheckAll}
              />
            </TableHead>
            <TableHead>Episode</TableHead>
            <TableHead className="w-44">Air date</TableHead>
            <TableHead className="w-24">Runtime</TableHead>
            <TableHead className="w-44">
              <Datepicker
                className="relative w-full"
                offset={{
                  x: 0,
                  y: 46,
                }}
                onSelect={(selected) =>
                  console.log('onSelect:', {
                    selected,
                    selectedAsString: selected?.toISOString(),
                  })
                }
              >
                <span className="block w-full min-w-32 cursor-pointer appearance-none rounded-md border border-neutral-800 bg-neutral-900 py-2 pl-3 pr-6 text-left outline-none">
                  Watched on
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
            const checkedItem = checkedItems.find(
              (item) =>
                item.seasonNumber === episode.seasonNumber &&
                item.episodeNumber === episode.episodeNumber,
            );
            const watchedItem = watched.find(
              (item) =>
                item.seasonNumber === episode.seasonNumber &&
                item.episodeNumber === episode.episodeNumber,
            );

            return (
              <EpisodeRow
                key={episode.id}
                episode={episode}
                isChecked={Boolean(checkedItem)}
                item={checkedItem ?? watchedItem}
                onToggle={handleToggle}
                watchProvider={watchProvider}
              />
            );
          })}
        </TableBody>
      </Table>
      <div className="mt-10 flex w-full items-center gap-x-4">
        <div className="flex items-baseline text-sm text-white/60">
          <span className="rounded bg-white/10 px-2 py-1 font-medium text-white">
            {checkedItems.length.toLocaleString()}
          </span>
          <span className="ml-2">items</span>
        </div>
        <button
          onClick={() => router.back()}
          className="ml-auto flex h-11 min-w-24 cursor-pointer items-center justify-center rounded-3xl bg-white/5 px-5 text-sm leading-none tracking-wide hover:bg-white/10"
        >
          <span>Back</span>
        </button>
        <button
          onClick={() => console.log('SAVE:', checkedItems)}
          className={twMerge(
            'flex h-11 min-w-24 cursor-pointer items-center justify-center rounded-3xl bg-white px-5 text-sm leading-none tracking-wide text-neutral-900',
            !checkedItems.length && 'cursor-not-allowed opacity-40',
          )}
          disabled={!checkedItems.length}
        >
          <span>Save</span>
        </button>
      </div>
    </>
  );
}

export default memo(Episodes);
