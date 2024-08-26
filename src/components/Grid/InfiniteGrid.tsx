'use client';

import { memo, useCallback, useMemo } from 'react';

import createUseRestorableState from '@/hooks/createUseRestorableState';
import { type TvSeries } from '@/types/tv-series';

import Grid from './Grid';
import InfiniteScroll from '../InfiniteScroll/InfiniteScroll';
import Poster from '../Tiles/Poster';

const useRestorableItems = createUseRestorableState<TvSeries[]>();

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
  const hasMoreData = useMemo(
    () => items.length < totalNumberOfItems,
    [items.length, totalNumberOfItems],
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
    const itemsPerPage = Math.ceil(totalNumberOfItems / totalNumberOfPages);
    const currentPage = Math.ceil(items.length / itemsPerPage);
    const nextPage = currentPage + 1;
    const newItems = await fetchItems(nextPage);

    setItems((prevItems) => [...prevItems, ...newItems]);
  }, [
    fetchItems,
    items.length,
    setItems,
    totalNumberOfItems,
    totalNumberOfPages,
  ]);

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
