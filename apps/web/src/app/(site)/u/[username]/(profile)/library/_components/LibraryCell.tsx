'use client';

import * as m from 'motion/react-m';
import { memo } from 'react';

import {
  GRID_ENTER,
  GRID_EXIT,
  GRID_TRANSITION,
} from '@/components/motion/gridExit';
import type { TileView } from '@/lib/profile/tileView';
import { LIBRARY_CELL, TILE_SIZES } from './gridStyles';
import LibraryTile from './LibraryTile';

/**
 * One grid cell: the Motion `li` (its exit and its FLIP while something
 * leaves, `gridExit`; its rise in) around the tile. Memoised: a page landing, a
 * transition starting or a pick re-renders only the cells whose props
 * changed, not every Motion `li` of a 300-tile shelf.
 */
function LibraryCell({
  eager,
  moving,
  tile,
}: Readonly<{
  eager: boolean;
  /** Something is leaving: the cells FLIP to their new places */
  moving: boolean;
  tile: TileView;
}>) {
  const layout = moving ? 'position' : false;
  return (
    <m.li
      className={LIBRARY_CELL}
      exit={GRID_EXIT}
      layout={layout}
      transition={GRID_TRANSITION}
      {...GRID_ENTER}
    >
      <LibraryTile eager={eager} sizes={TILE_SIZES} tile={tile} />
    </m.li>
  );
}

const MemoLibraryCell = memo(LibraryCell);
MemoLibraryCell.displayName = 'LibraryCell';

export default MemoLibraryCell;
