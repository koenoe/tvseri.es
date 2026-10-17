'use client';

import type { ListItem } from '@tvseri.es/schemas';
import { memo, useMemo } from 'react';

import usePaginated from '@/hooks/usePaginated';
import InfiniteScroll from '../InfiniteScroll/InfiniteScroll';
import Poster from '../Tiles/Poster';
import Grid from './Grid';
import PaginationNotice from './PaginationNotice';

// Note: TMDb can return the same items on different pages
// see: https://www.themoviedb.org/talk/5ee3abd1590086001f50b3c1#667b0702a8ad7d3577f69f20
const getId = (item: ListItem) => item.id;

function InfiniteGrid({
  endpoint,
  items: initialItems,
  nextCursor: initialCursor = null,
}: Readonly<{
  endpoint: string;
  items: ReadonlyArray<ListItem>;
  nextCursor?: string | null;
}>) {
  const { items, canLoadMore, loadMore, status } = usePaginated({
    endpoint,
    getId,
    initialCursor,
    initialItems,
    restoreKey: endpoint,
  });

  const itemsWithPoster = useMemo(
    () => items.filter((item) => !!item.posterImage),
    [items],
  );

  return (
    <>
      <InfiniteScroll hasMoreData={canLoadMore} loadMore={loadMore}>
        <Grid>
          {itemsWithPoster.map((item) => (
            <Poster item={item} key={item.id} />
          ))}
        </Grid>
      </InfiniteScroll>
      <PaginationNotice onRetry={loadMore} status={status} />
    </>
  );
}

InfiniteGrid.displayName = 'InfiniteGrid';

export default memo(InfiniteGrid);
