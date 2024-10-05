'use client';

import { memo, useCallback, useMemo } from 'react';

import createUseRestorableState from '@/hooks/createUseRestorableState';
import { type TvSeries } from '@/types/tv-series';

import Grid from './Grid';
import InfiniteScroll from '../InfiniteScroll/InfiniteScroll';
import Poster from '../Tiles/Poster';

const useRestorableItems = createUseRestorableState<TvSeries[]>();
const useRestorableHasMoreData = createUseRestorableState<boolean>();

function InfiniteGrid({
  endpoint,
  items: itemsFromProps,
  totalNumberOfItems,
  totalNumberOfPages,
}: Readonly<{
  endpoint: string;
  items: TvSeries[];
  totalNumberOfItems: number;
  totalNumberOfPages: number;
}>) {
  const [items, setItems] = useRestorableItems(endpoint, itemsFromProps);
  const [hasMoreData, setHasMoreData] = useRestorableHasMoreData(
    endpoint,
    items.length < totalNumberOfItems,
  );

  const fetchItems = useCallback(
    async (page: number = 1) => {
      const [baseEndpoint, queryString] = endpoint.split('?');
      const searchParams = new URLSearchParams(queryString);
      searchParams.set('page', page.toString());
      const response = await fetch(
        `${baseEndpoint}?${searchParams.toString()}`,
      );
      const newItems = (await response.json()) as TvSeries[];
      return newItems;
    },
    [endpoint],
  );

  const handleLoadMore = useCallback(async () => {
    // Note: see https://www.themoviedb.org/talk/623012ed357c00001b46ae10#62308d1fa3e4ba0047843a6c
    const itemsPerPage = 20;
    const currentPage = Math.ceil(items.length / itemsPerPage);
    const nextPage = currentPage + 1;

    if (nextPage > totalNumberOfPages) {
      setHasMoreData(false);
      return;
    }

    const newItems = await fetchItems(nextPage);

    // Note: shouldn't happen, but extra safeguard
    if (newItems.length === 0) {
      setHasMoreData(false);
      return;
    }

    setItems((prevItems) => [...prevItems, ...newItems]);

    if (nextPage === totalNumberOfPages) {
      setHasMoreData(false);
    }
  }, [fetchItems, items.length, setHasMoreData, setItems, totalNumberOfPages]);

  // Note: use a Set to track unique IDs to prevent duplicates
  // as TMDb can return same items on different pages
  // see: https://www.themoviedb.org/talk/5ee3abd1590086001f50b3c1#667b0702a8ad7d3577f69f20
  const uniqueItems = useMemo(
    () => [
      ...new Map(
        items
          .filter((item) => !!item.posterImage && !!item.backdropImage)
          .map((item) => [item.id, item]),
      ).values(),
    ],
    [items],
  );

  return (
    <InfiniteScroll hasMoreData={hasMoreData} loadMore={handleLoadMore}>
      <Grid>
        {uniqueItems.map((item) => (
          <Poster key={item.id} item={item} />
        ))}
      </Grid>
    </InfiniteScroll>
  );
}

export default memo(InfiniteGrid);
