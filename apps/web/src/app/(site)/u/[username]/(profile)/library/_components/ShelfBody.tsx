'use client';

import type { ReactNode } from 'react';
import SwapIn from '@/components/motion/SwapIn';
import useSettledEmpty from '../../_components/blocks/useSettledEmpty';
import ShelfGrid, { type ShelfGridProps } from './ShelfGrid';

/**
 * The shelf's grid, or `empty` once its last tile has gone: the empty state
 * waits for the leaving tiles' exits (`settled`), then rises in over them
 * (`SwapIn`), as a profile lane's does. Keyed by the list, so a new first
 * page with nothing on it shows `empty` at once, with no swap.
 */
export default function ShelfBody({
  empty,
  settled,
  ...grid
}: Readonly<ShelfGridProps & { empty: ReactNode }>) {
  const { empty: gone, onSettled } = useSettledEmpty(grid.tiles.length);
  const onExitComplete = () => {
    settled();
    onSettled();
  };
  const swapKey = gone ? 'empty' : 'grid';
  return (
    <SwapIn swapKey={swapKey}>
      {gone ? empty : <ShelfGrid {...grid} settled={onExitComplete} />}
    </SwapIn>
  );
}
