'use client';

import type { WatchedItem } from '@tvseri.es/schemas';
import { LayoutGroup, motion } from 'motion/react';
import { memo, useMemo, useState } from 'react';

import HistoryCard from './HistoryCard';

// Stack visual configuration
const STACK_OFFSET = 12;
const STACK_SCALE = 0.98;
const MAX_VISIBLE_STACKED = 3;

// Shared transition for consistent animations
const TRANSITION = { duration: 0.25, ease: [0.4, 0, 0.2, 1] } as const;

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type GroupedItems = ReadonlyArray<{
  items: WatchedItem[];
  seriesId: number;
}>;

// -----------------------------------------------------------------------------
// Grouping utilities
// -----------------------------------------------------------------------------

/**
 * Groups consecutive watched items by series ID.
 * e.g. [A, A, B, A] -> [[A, A], [B], [A]]
 */
function groupConsecutiveItems(
  items: ReadonlyArray<WatchedItem>,
): GroupedItems {
  if (items.length === 0) return [];

  const groups: { items: WatchedItem[]; seriesId: number }[] = [];
  let currentGroup: { items: WatchedItem[]; seriesId: number } | null = null;

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

// -----------------------------------------------------------------------------
// StackedHistoryGroup
// -----------------------------------------------------------------------------

type StackedHistoryGroupProps = Readonly<{
  group: GroupedItems[number];
}>;

function StackedHistoryGroup({ group }: StackedHistoryGroupProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { items } = group;
  const firstItem = items[0];

  if (!firstItem) {
    return null;
  }

  // Single item - no stacking needed
  if (items.length === 1) {
    return (
      <motion.div layout layoutDependency={undefined}>
        <HistoryCard item={firstItem} />
      </motion.div>
    );
  }

  const visibleStackedItems = items.slice(0, MAX_VISIBLE_STACKED);
  const isStacked = !isExpanded;
  const displayedItems = isExpanded ? items : visibleStackedItems;
  const paddingBottom = isStacked
    ? (visibleStackedItems.length - 1) * STACK_OFFSET
    : undefined;

  return (
    <motion.div
      className={isExpanded ? 'flex flex-col gap-4' : 'relative cursor-pointer'}
      layout
      layoutDependency={isExpanded}
      style={{ paddingBottom }}
    >
      {displayedItems.map((item, index) => {
        const stackIndex = Math.min(index, MAX_VISIBLE_STACKED - 1);
        const itemCount = displayedItems.length;
        const isTopCard = index === 0;
        const shouldBeAbsolute = isStacked && !isTopCard;
        const showShadow = isStacked && items.length > 1;
        const opacity = isExpanded || isTopCard ? 1 : 0.75;
        const scale = isExpanded ? 1 : STACK_SCALE ** stackIndex;

        return (
          <motion.div
            key={`${item.seriesId}:${item.seasonNumber}:${item.episodeNumber}:${item.watchedAt}`}
            layout
            layoutDependency={isExpanded}
            style={{
              left: shouldBeAbsolute ? 0 : undefined,
              position: shouldBeAbsolute ? 'absolute' : 'relative',
              right: shouldBeAbsolute ? 0 : undefined,
              top: shouldBeAbsolute ? stackIndex * STACK_OFFSET : undefined,
              zIndex: itemCount - index,
            }}
            transition={TRANSITION}
          >
            <motion.div
              animate={{ opacity, scale }}
              style={{ transformOrigin: 'top center' }}
              transition={TRANSITION}
            >
              <div className="relative">
                <HistoryCard item={item} showShadow={showShadow} />
                {isStacked && (
                  <div
                    className="absolute inset-0 z-10"
                    onClick={() => setIsExpanded(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setIsExpanded(true);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  />
                )}
              </div>
            </motion.div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

StackedHistoryGroup.displayName = 'StackedHistoryGroup';

const MemoizedStackedHistoryGroup = memo(StackedHistoryGroup);

// -----------------------------------------------------------------------------
// HistoryCardStack (main export)
// -----------------------------------------------------------------------------

type HistoryCardStackProps = Readonly<{
  items: ReadonlyArray<WatchedItem>;
}>;

function HistoryCardStack({ items }: HistoryCardStackProps) {
  const groupedItems = useMemo(() => groupConsecutiveItems(items), [items]);

  return (
    <LayoutGroup>
      <motion.div className="flex flex-col gap-4" layout>
        {groupedItems.map((group, index) => {
          const key = `group-${index}-${group.seriesId}-${group.items[0]?.watchedAt}`;

          return <MemoizedStackedHistoryGroup group={group} key={key} />;
        })}
      </motion.div>
    </LayoutGroup>
  );
}

HistoryCardStack.displayName = 'HistoryCardStack';

export default memo(HistoryCardStack);
