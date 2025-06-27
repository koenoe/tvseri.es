'use client';

import type { ListItem } from '@tvseri.es/types';
import { memo, useCallback, useMemo } from 'react';

import createUseRestorableState from '@/hooks/createUseRestorableState';
import InfiniteScroll from '../InfiniteScroll/InfiniteScroll';
import Poster from '../Tiles/Poster';
import Grid from './Grid';

const useRestorableItems = createUseRestorableState<ListItem[]>();
const useRestorableNextPageOrCursor = createUseRestorableState<
  string | undefined | null
>();

function InfiniteGrid({
  endpoint,
  items: itemsFromProps,
  nextPageOrCursor: nextPageOrCursorFromProps,
}: Readonly<{
  endpoint: string;
  items: ListItem[];
  nextPageOrCursor?: string | null;
}>) {
  const [items, setItems] = useRestorableItems(endpoint, itemsFromProps);
  const [nextPageOrCursor, setNextPageOrCursor] = useRestorableNextPageOrCursor(
    endpoint,
    nextPageOrCursorFromProps,
  );

  const fetchItems = useCallback(
    async (pageOrCursor: string) => {
      const [baseEndpoint, queryString] = endpoint.split('?');
      const searchParams = new URLSearchParams(queryString);
      searchParams.set('pageOrCursor', pageOrCursor);
      const response = await fetch(
        `${baseEndpoint}?${searchParams.toString()}`,
      );
      const result = (await response.json()) as Readonly<{
        items: ListItem[];
        nextPageOrCursor: string | null;
      }>;
      return result;
    },
    [endpoint],
  );

  const handleLoadMore = useCallback(async () => {
    if (!nextPageOrCursor) {
      return;
    }

    const result = await fetchItems(nextPageOrCursor);
    const { items: newItems, nextPageOrCursor: nextPageOrCursorFromResult } =
      result;

    // Note: shouldn't happen, but extra safeguard
    if (newItems.length === 0) {
      setNextPageOrCursor(null);
      return;
    }

    setNextPageOrCursor(nextPageOrCursorFromResult);
    setItems((prevItems) => [...prevItems, ...newItems]);
  }, [fetchItems, nextPageOrCursor, setItems, setNextPageOrCursor]);

  // Note: use a Set to track unique IDs to prevent duplicates
  // as TMDb can return same items on different pages
  // see: https://www.themoviedb.org/talk/5ee3abd1590086001f50b3c1#667b0702a8ad7d3577f69f20
  const uniqueItems = useMemo(
    () => [
      ...new Map(
        items
          .filter((item) => !!item.posterImage)
          .map((item) => [item.id, item]),
      ).values(),
    ],
    [items],
  );

  return (
    <InfiniteScroll hasMoreData={!!nextPageOrCursor} loadMore={handleLoadMore}>
      <Grid>
        {uniqueItems.map((item) => (
          <Poster item={item} key={item.id} />
        ))}
      </Grid>
    </InfiniteScroll>
  );
}

export default memo(InfiniteGrid);
