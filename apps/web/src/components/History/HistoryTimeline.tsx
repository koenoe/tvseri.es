'use client';

import { memo, useMemo } from 'react';

import { groupItemsByTimePeriod } from './groupItemsByTimePeriod';
import HistoryCardStack from './HistoryCardStack';
import Timeline, { type TimelineEntry } from './Timeline';
import type { HistoryItem } from './toHistoryItem';

type Props = Readonly<{
  items: ReadonlyArray<HistoryItem>;
}>;

function HistoryTimeline({ items }: Props) {
  const timelineData = useMemo<TimelineEntry[]>(() => {
    const groups = groupItemsByTimePeriod(items);
    return groups.map((group) => ({
      content: <HistoryCardStack items={group.items} />,
      title: group.title,
    }));
  }, [items]);

  if (timelineData.length === 0) {
    return null;
  }

  return <Timeline data={timelineData} />;
}

HistoryTimeline.displayName = 'HistoryTimeline';

export default memo(HistoryTimeline);
