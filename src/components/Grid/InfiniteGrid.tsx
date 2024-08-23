'use client';

import { memo, useCallback, useState } from 'react';

import { type TvSeries } from '@/types/tv-series';

import Grid from './Grid';
import InfiniteScroll from '../InfiniteScroll/InfiniteScroll';
import Poster from '../Tiles/Poster';

function InfiniteGrid({
  endpoint,
  items: itemsFromProps,
  totalNumberOfItems,
}: Readonly<{
  endpoint: string;
  items: TvSeries[];
  totalNumberOfItems: number;
}>) {
  const [items, setItems] = useState<TvSeries[]>(itemsFromProps);

  const handleLoadMore = useCallback(
    async (page: number) => {
      const [baseEndpoint, queryString] = endpoint.split('?');

      const searchParams = new URLSearchParams(queryString);
      searchParams.set('page', page.toString());

      const response = await fetch(
        `${baseEndpoint}?${searchParams.toString()}`,
      );
      const newItems = (await response.json()) as TvSeries[];

      setItems((prevItems) => [...prevItems, ...newItems]);
    },
    [endpoint],
  );

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
