'use client';

import type { LibraryShelf } from '@tvseri.es/schemas';
import { AnimatePresence } from 'motion/react';
import type { RefObject } from 'react';
import MaxMotion from '@/components/motion/MaxMotion';
import type { TileView } from '@/lib/profile/tileView';
import InfiniteScroll from '../../_components/pagination/InfiniteScroll';
import type { PaginationStatus } from '../../_lib/pagination/usePaginated';
import { EAGER, LIBRARY_GRID } from './gridStyles';
import LibraryCell from './LibraryCell';
import TileGhosts from './TileGhosts';

export type ShelfGridProps = Readonly<{
  hasMore: boolean;
  list: number;
  listRef: RefObject<HTMLUListElement | null>;
  loadMore: () => Promise<unknown>;
  moving: boolean;
  settled: () => void;
  shelf: LibraryShelf;
  status: PaginationStatus;
  tiles: ReadonlyArray<TileView>;
}>;

/**
 * The shelf's tiles: next pages load two rows before the end. Each new
 * first page is a new list (`list`, which keys `ShelfBody`): the old tiles
 * go at once (no exits) and the new ones fade in. `moving` turns on
 * `layout` only while something leaves: never 300 tiles measuring at rest.
 */
export default function ShelfGrid({
  hasMore,
  list,
  listRef,
  loadMore,
  moving,
  settled,
  shelf,
  status,
  tiles,
}: ShelfGridProps) {
  const animateEntries = list > 0;
  return (
    <InfiniteScroll
      hasMore={hasMore}
      loadMore={loadMore}
      margin="0px 0px 600px 0px"
    >
      <MaxMotion>
        <ul className={LIBRARY_GRID} ref={listRef}>
          <AnimatePresence initial={animateEntries} onExitComplete={settled}>
            {tiles.map((tile, index) => {
              const eager = index < EAGER;
              return (
                <LibraryCell
                  eager={eager}
                  key={tile.id}
                  moving={moving}
                  tile={tile}
                />
              );
            })}
          </AnimatePresence>
        </ul>
      </MaxMotion>
      {status === 'loading' ? (
        <div className="mt-7">
          <TileGhosts count={5} shelf={shelf} />
        </div>
      ) : null}
    </InfiniteScroll>
  );
}
