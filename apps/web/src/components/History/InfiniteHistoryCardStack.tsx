'use client';

import { memo } from 'react';

import usePaginated from '@/hooks/usePaginated';
import PaginationNotice from '../Grid/PaginationNotice';
import InfiniteScroll from '../InfiniteScroll/InfiniteScroll';
import HistoryTimeline from './HistoryTimeline';
import type { HistoryItem } from './toHistoryItem';

function InfiniteHistoryCardStack({
  items: initialItems,
  nextCursor: initialCursor = null,
  username,
}: Readonly<{
  items: ReadonlyArray<HistoryItem>;
  nextCursor?: string | null;
  username: string;
}>) {
  const endpoint = `/api/u/${username}/watched`;
  const { items, canLoadMore, loadMore, status } = usePaginated({
    endpoint,
    initialCursor,
    initialItems,
    restoreKey: endpoint,
  });

  return (
    <>
      <InfiniteScroll hasMoreData={canLoadMore} loadMore={loadMore}>
        <HistoryTimeline items={items} />
      </InfiniteScroll>
      <PaginationNotice onRetry={loadMore} status={status} />
    </>
  );
}

InfiniteHistoryCardStack.displayName = 'InfiniteHistoryCardStack';

export default memo(InfiniteHistoryCardStack);
