'use client';

import { intlFormatDistance } from 'date-fns';
import Image from 'next/image';
import Link from 'next/link';
import { memo, useMemo } from 'react';
import { twMerge } from 'tailwind-merge';
import SeasonEpisodeBadge from '@/components/EpisodeMeta/SeasonEpisodeBadge';
import WatchedMeta from '@/components/EpisodeMeta/WatchedMeta';
import { CalendarOutlineIcon } from '@/components/Icons/CalendarOutlineIcon';
import formatDate, { formatDateOnly } from '@/utils/formatDate';
import svgBase64Shimmer from '@/utils/svgBase64Shimmer';
import type { HistoryItem } from './toHistoryItem';

type Props = Readonly<{
  item: HistoryItem;
  showShadow?: boolean;
}>;

function HistoryCard({ item, showShadow = false }: Props) {
  const href = `/tv/${item.seriesId}/${item.slug}?season=${item.seasonNumber}`;
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
      {item.posterImage ? (
        <div className="relative w-12 flex-shrink-0 overflow-clip rounded-xl after:absolute after:inset-0 after:rounded-xl after:shadow-[inset_0_0_0_1px_rgba(221,238,255,0.08)] after:content-[''] md:w-16">
          <Image
            alt={item.title}
            className="h-full w-full object-cover"
            draggable={false}
            height={96}
            placeholder={`data:image/svg+xml;base64,${svgBase64Shimmer(64, 96)}`}
            sizes="(min-width: 768px) 64px, 48px"
            src={item.posterImage}
            width={64}
          />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-base font-semibold md:text-lg">
            {item.title}
          </span>
          {item.watchProviderLogoImage && item.watchProviderName ? (
            <Image
              alt={item.watchProviderName}
              className="size-6 flex-shrink-0 rounded md:size-8"
              height={32}
              src={item.watchProviderLogoImage}
              width={32}
            />
          ) : null}
        </div>
        <div className="mt-2 flex min-w-0 flex-nowrap items-center gap-2">
          <SeasonEpisodeBadge
            episodeNumber={item.episodeNumber}
            seasonNumber={item.seasonNumber}
          />
          <span className="truncate text-sm">{item.episodeTitle}</span>
        </div>
        <div className="mt-3 flex w-full items-center justify-between gap-1.5 text-xs font-medium">
          <WatchedMeta className="flex-shrink-0" runtime={item.runtime}>
            {/* Relative to now ("2 hours ago"), so the server's and the
                browser's text can differ; the browser's wins */}
            <div className="text-nowrap" suppressHydrationWarning>
              {formattedWatchedAt}
            </div>
          </WatchedMeta>
          {item.episodeAirDate ? (
            <span className="hidden flex-shrink-0 items-center gap-1.5 text-nowrap rounded-md bg-black/10 px-2.5 py-1 text-white/30 md:flex">
              <CalendarOutlineIcon className="size-3 flex-shrink-0" />
              Aired {formatDateOnly(item.episodeAirDate)}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

HistoryCard.displayName = 'HistoryCard';

export default memo(HistoryCard);
