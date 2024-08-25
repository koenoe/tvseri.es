'use client';

import { memo, useCallback } from 'react';

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

  const handleLoadMore = useCallback(async () => {
    const itemsPerPage = Math.ceil(totalNumberOfItems / totalNumberOfPages);
    const currentPage = Math.ceil(items.length / itemsPerPage);
    const nextPage = currentPage + 1;
    const [baseEndpoint, queryString] = endpoint.split('?');
    const searchParams = new URLSearchParams(queryString);
    searchParams.set('page', nextPage.toString());
    const response = await fetch(`${baseEndpoint}?${searchParams.toString()}`);
    const newItems = (await response.json()) as TvSeries[];

    setItems((prevItems) => [...prevItems, ...newItems]);
  }, [
    endpoint,
    items.length,
    setItems,
    totalNumberOfItems,
    totalNumberOfPages,
  ]);

  const hasMoreData = items.length < totalNumberOfItems;

  return (
    <InfiniteScroll hasMoreData={hasMoreData} loadMore={handleLoadMore}>
      <Grid>
        {items.map((item) => (
          <Poster key={item.id} item={item} />
        ))}
      </Grid>
    </InfiniteScroll>
  );
}

export default memo(InfiniteGrid);
