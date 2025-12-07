'use client';

import type { WatchedItem } from '@tvseri.es/schemas';
import { formatDistanceToNowStrict } from 'date-fns';
import { LayoutGroup, motion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import formatDate from '@/utils/formatDate';
import formatRuntime from '@/utils/formatRuntime';
import formatSeasonAndEpisode from '@/utils/formatSeasonAndEpisode';
import svgBase64Shimmer from '@/utils/svgBase64Shimmer';

const STACK_OFFSET = 12;
const STACK_SCALE = 0.98;

export function HistoryCard({
  item,
  pointerEvents = 'auto',
  showShadow,
}: Readonly<{
  item: WatchedItem;
  pointerEvents?: 'auto' | 'none';
  showShadow?: boolean;
}>) {
  return (
    <Link
      className={`flex w-full flex-row items-center gap-4 rounded-xl bg-neutral-800 p-4${showShadow ? ' shadow-[0_1px_4px_rgba(0,0,0,0.15)]' : ''}`}
      href={`/tv/${item.seriesId}/${item.slug}`}
      style={{ pointerEvents }}
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

type GroupedItems = ReadonlyArray<{
  seriesId: number;
  items: WatchedItem[];
}>;

function groupConsecutiveItems(
  items: ReadonlyArray<WatchedItem>,
): GroupedItems {
  if (items.length === 0) return [];

  const groups: { seriesId: number; items: WatchedItem[] }[] = [];
  let currentGroup: { seriesId: number; items: WatchedItem[] } | null = null;

  for (const item of items) {
    if (currentGroup && currentGroup.seriesId === item.seriesId) {
      currentGroup.items.push(item);
    } else {
      if (currentGroup) {
        groups.push(currentGroup);
      }
      currentGroup = { items: [item], seriesId: item.seriesId };
    }
  }

  if (currentGroup) {
    groups.push(currentGroup);
  }

  return groups;
}

function StackedGroup({
  group,
}: Readonly<{
  group: GroupedItems[number];
}>) {
  const [isExpanded, setIsExpanded] = useState(false);
  const items = group.items;
  const maxVisibleStacked = 3;
  const firstItem = items[0];

  if (!firstItem) {
    return null;
  }

  // Single item - no stacking needed
  if (items.length === 1) {
    return (
      <motion.div layout>
        <HistoryCard item={firstItem} />
      </motion.div>
    );
  }

  const visibleStackedItems = items.slice(0, maxVisibleStacked);

  return (
    <motion.div
      className={isExpanded ? 'flex flex-col gap-4' : 'relative cursor-pointer'}
      layout
      style={
        !isExpanded
          ? { paddingBottom: (visibleStackedItems.length - 1) * STACK_OFFSET }
          : undefined
      }
    >
      {(isExpanded ? items : visibleStackedItems).map((item, index) => {
        const stackIndex = Math.min(index, maxVisibleStacked - 1);
        const itemCount = isExpanded
          ? items.length
          : visibleStackedItems.length;

        return (
          <motion.div
            key={`${item.seriesId}:${item.seasonNumber}:${item.episodeNumber}:${item.watchedAt}`}
            layout
            style={{
              position: !isExpanded && index > 0 ? 'absolute' : 'relative',
              zIndex: itemCount - index,
              ...(isExpanded
                ? {}
                : {
                    left: 0,
                    right: 0,
                    top: stackIndex * STACK_OFFSET,
                  }),
            }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          >
            <motion.div
              animate={{
                opacity: isExpanded || index === 0 ? 1 : 0.75,
                scale: isExpanded ? 1 : STACK_SCALE ** stackIndex,
              }}
              onTap={() => {
                // On collapsed stack, tap expands
                if (!isExpanded) {
                  setIsExpanded(true);
                }
              }}
              style={{ transformOrigin: 'top center' }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            >
              <HistoryCard
                item={item}
                pointerEvents={isExpanded ? 'auto' : 'none'}
                showShadow={!isExpanded && items.length > 1}
              />
            </motion.div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

export default function HistoryCardStack({
  items,
}: Readonly<{
  items: ReadonlyArray<WatchedItem>;
}>) {
  const groupedItems = useMemo(() => groupConsecutiveItems(items), [items]);

  return (
    <LayoutGroup>
      <motion.div className="flex flex-col gap-4" layout>
        {groupedItems.map((group, index) => (
          <StackedGroup
            group={group}
            key={`group-${index}-${group.seriesId}-${group.items[0]?.watchedAt}`}
          />
        ))}
      </motion.div>
    </LayoutGroup>
  );
}
