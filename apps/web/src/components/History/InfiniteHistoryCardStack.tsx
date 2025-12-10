'use client';

import type { WatchedItem } from '@tvseri.es/schemas';
import { memo, useCallback } from 'react';

import createUseRestorableState from '@/hooks/createUseRestorableState';
import InfiniteScroll from '../InfiniteScroll/InfiniteScroll';
import HistoryTimeline from './HistoryTimeline';

const useRestorableItems = createUseRestorableState<WatchedItem[]>();
const useRestorableCursor = createUseRestorableState<
  string | null | undefined
>();

function InfiniteHistoryCardStack({
  items: itemsFromProps,
  nextCursor: nextCursorFromProps,
  username,
}: Readonly<{
  items: ReadonlyArray<WatchedItem>;
  nextCursor?: string | null;
  username: string;
}>) {
  const endpoint = `/api/u/${username}/watched`;
  const [items, setItems] = useRestorableItems(endpoint, [...itemsFromProps]);
  const [nextCursor, setNextCursor] = useRestorableCursor(
    endpoint,
    nextCursorFromProps,
  );

  const fetchItems = useCallback(
    async (cursor: string) => {
      const response = await fetch(`${endpoint}?cursor=${cursor}`);
      const result = (await response.json()) as Readonly<{
        items: WatchedItem[];
        nextCursor: string | null;
      }>;
      return result;
    },
    [endpoint],
  );

  const handleLoadMore = useCallback(async () => {
    if (!nextCursor) {
      return;
    }

    const result = await fetchItems(nextCursor);
    const { items: newItems, nextCursor: nextCursorFromResult } = result;

    if (newItems.length === 0) {
      setNextCursor(null);
      return;
    }

    setNextCursor(nextCursorFromResult);
    setItems((prevItems) => [...prevItems, ...newItems]);
  }, [fetchItems, nextCursor, setItems, setNextCursor]);

  return (
    <InfiniteScroll hasMoreData={!!nextCursor} loadMore={handleLoadMore}>
      <HistoryTimeline items={items} />
    </InfiniteScroll>
  );
}

InfiniteHistoryCardStack.displayName = 'InfiniteHistoryCardStack';

export default memo(InfiniteHistoryCardStack);
