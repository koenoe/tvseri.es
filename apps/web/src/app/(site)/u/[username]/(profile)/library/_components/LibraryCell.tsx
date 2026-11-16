'use client';

import * as m from 'motion/react-m';
import { memo } from 'react';

import type { TileView } from '../_lib/tileView';
import { LIBRARY_CELL, TILE_SIZES } from './gridStyles';
import LibraryTile from './LibraryTile';

/** A removed tile fades and shrinks, the rest FLIP to their cells */
const EXIT = { opacity: 0, scale: 0.96 } as const;
const CURVE = [0.2, 0.8, 0.2, 1] as const;
const FADE = { duration: 0.2, ease: CURVE } as const;
/** The FLIP of the neighbours (280ms); fades, the scale and the rise 200ms */
const TRANSITION = {
  default: { duration: 0.28, ease: CURVE },
  opacity: FADE,
  scale: FADE,
  y: FADE,
} as const;
/** A new tile: opacity 0 → 1, translateY 8 → 0 */
const ENTER = {
  animate: { opacity: 1, y: 0 },
  initial: { opacity: 0, y: 8 },
} as const;

/**
 * One grid cell: the Motion `li` (its exit, its FLIP while something
 * leaves, its rise in) around the tile. Memoised: a page landing, a
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
      exit={EXIT}
      layout={layout}
      transition={TRANSITION}
      {...ENTER}
    >
      <LibraryTile eager={eager} sizes={TILE_SIZES} tile={tile} />
    </m.li>
  );
}

const MemoLibraryCell = memo(LibraryCell);
MemoLibraryCell.displayName = 'LibraryCell';

export default MemoLibraryCell;
