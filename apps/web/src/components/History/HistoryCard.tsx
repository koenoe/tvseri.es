'use client';

import type { WatchedItem } from '@tvseri.es/schemas';
import { intlFormatDistance } from 'date-fns';
import Image from 'next/image';
import Link from 'next/link';
import { memo, useMemo } from 'react';
import { twMerge } from 'tailwind-merge';

import formatDate from '@/utils/formatDate';
import formatRuntime from '@/utils/formatRuntime';
import formatSeasonAndEpisode from '@/utils/formatSeasonAndEpisode';
import svgBase64Shimmer from '@/utils/svgBase64Shimmer';

type Props = Readonly<{
  item: WatchedItem;
  showShadow?: boolean;
}>;

function HistoryCard({ item, showShadow = false }: Props) {
  const href = `/tv/${item.seriesId}/${item.slug}`;
  const formattedWatchedAt = useMemo(() => {
    const watchedDate = new Date(item.watchedAt);
    const now = new Date();
    const isCurrentMonth =
      watchedDate.getMonth() === now.getMonth() &&
      watchedDate.getFullYear() === now.getFullYear();
    if (!isCurrentMonth) {
      const isCurrentYear = watchedDate.getFullYear() === now.getFullYear();
      return formatDate(item.watchedAt, {
        year: isCurrentYear ? undefined : 'numeric',
      });
    }
    return intlFormatDistance(watchedDate, now);
  }, [item.watchedAt]);

  return (
    <Link
      className={twMerge(
        'flex w-full flex-row items-center gap-4 rounded-xl bg-neutral-800 p-4',
        showShadow && 'shadow-[0_1px_4px_rgba(0,0,0,0.15)]',
      )}
      href={href}
    >
      {item.posterImage && (
        <div className="relative w-12 flex-shrink-0 overflow-clip rounded-xl after:absolute after:inset-0 after:rounded-xl after:shadow-[inset_0_0_0_1px_rgba(221,238,255,0.08)] after:content-[''] md:w-16">
          <Image
            alt={item.title}
            className="h-full w-full object-cover"
            draggable={false}
            height={96}
            placeholder={`data:image/svg+xml;base64,${svgBase64Shimmer(64, 96)}`}
            src={item.posterImage}
            unoptimized
            width={64}
          />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-base font-semibold md:text-lg">
            {item.title}
          </span>
          {item.watchProviderLogoImage && item.watchProviderName && (
            <Image
              alt={item.watchProviderName}
              className="size-6 flex-shrink-0 rounded md:size-8"
              height={32}
              src={item.watchProviderLogoImage}
              unoptimized
              width={32}
            />
          )}
        </div>
        <div className="mt-2 flex min-w-0 flex-nowrap items-center gap-2">
          <span className="flex h-6 w-14 flex-shrink-0 items-center justify-center rounded-md bg-white/10 text-center text-xs font-medium">
            {formatSeasonAndEpisode({
              episodeNumber: item.episodeNumber,
              seasonNumber: item.seasonNumber,
            })}
          </span>
          <span className="truncate text-sm">{item.episodeTitle}</span>
        </div>
        <div className="mt-3 flex w-full items-center justify-between gap-1.5 text-xs font-medium">
          <div className="flex flex-shrink-0 gap-1.5">
            <div className="text-nowrap">{formattedWatchedAt}</div>
            <div className="text-nowrap opacity-60 before:mr-1 before:content-['—']">
              {formatRuntime(item.runtime)}
            </div>
          </div>
          {item.episodeAirDate && (
            <span className="hidden flex-shrink-0 text-nowrap rounded-md bg-black/10 px-2 py-0.5 text-white/30 md:inline">
              Aired {formatDate(item.episodeAirDate)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

HistoryCard.displayName = 'HistoryCard';

export default memo(HistoryCard);
