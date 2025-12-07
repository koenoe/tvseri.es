import type { WatchedItem } from '@tvseri.es/schemas';
import { formatDistanceToNowStrict } from 'date-fns';
import Image from 'next/image';
import Link from 'next/link';

import formatDate from '@/utils/formatDate';
import formatRuntime from '@/utils/formatRuntime';
import formatSeasonAndEpisode from '@/utils/formatSeasonAndEpisode';
import svgBase64Shimmer from '@/utils/svgBase64Shimmer';

export function HistoryCard({
  item,
}: Readonly<{
  item: WatchedItem;
}>) {
  return (
    <Link
      className="flex w-full flex-row items-center gap-4 rounded-xl bg-neutral-800 p-4"
      href={`/tv/${item.seriesId}/${item.slug}`}
    >
      {item.posterImage && (
        <div className="relative w-12 flex-shrink-0 overflow-clip rounded-lg after:absolute after:inset-0 after:rounded-lg after:shadow-[inset_0_0_0_1px_rgba(221,238,255,0.08)] after:content-[''] md:w-16">
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
            <div className="text-nowrap">
              {formatDistanceToNowStrict(item.watchedAt, { addSuffix: true })}
            </div>
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

export default function HistoryCardStack({
  items,
}: Readonly<{
  items: ReadonlyArray<WatchedItem>;
}>) {
  return (
    <div className="flex flex-col gap-4">
      {items.map((item) => (
        <HistoryCard
          item={item}
          key={`${item.seriesId}:${item.seasonNumber}:${item.episodeNumber}`}
        />
      ))}
    </div>
  );
}
