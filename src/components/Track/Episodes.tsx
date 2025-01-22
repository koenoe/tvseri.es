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
  const watchProviderName = item?.watchProviderName || watchProvider?.name;
  const watchProviderLogoImage =
    item?.watchProviderLogoImage || watchProvider?.logo;

  return (
    <TableRow onClick={() => onToggle(episode)}>
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
          <span className="flex h-6 w-14 flex-shrink-0 items-center justify-center rounded bg-neutral-700 text-center text-xs font-medium">
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
        <button
          onClick={(e) => {
            if (item) {
              e.stopPropagation();
              console.log('click watched on:', item);
            }
          }}
          className="cursor-pointer text-nowrap rounded-lg border border-neutral-700 bg-neutral-800 px-1.5 py-1 text-center text-xs text-neutral-400"
        >
          {formatDate(item?.watchedAt ?? Date.now())}
        </button>
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
            <TableHead className="w-44">Watched on</TableHead>
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
