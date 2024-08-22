'use client';

import { memo, useCallback, useState } from 'react';

import { type TvSeries } from '@/types/tv-series';

import Grid from './Grid';
import InfiniteScroll from '../InfiniteScroll/InfiniteScroll';
import Poster from '../Tiles/Poster';

function AccountListGrid({
  items: itemsFromProps,
  totalNumberOfItems,
  listType,
}: Readonly<{
  items: TvSeries[];
  totalNumberOfItems: number;
  listType: 'watchlist' | 'favorites';
}>) {
  const [items, setItems] = useState<TvSeries[]>(itemsFromProps);

  const handleLoadMore = useCallback(
    async (page: number) => {
      const response = await fetch(`/api/account/${listType}?page=${page}`);
      const newItems = (await response.json()) as TvSeries[];

      setItems((prevItems) => [...prevItems, ...newItems]);
    },
    [listType],
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

export default memo(AccountListGrid);
