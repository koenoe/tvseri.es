import type { ReactNode } from 'react';

import cn from '@/lib/cn';

import {
  ROW_INSET,
  ROW_LOOKS,
  ROW_TILE_WIDTH,
  ROW_TILES,
  type RowInset,
  type RowLook,
  type RowTiles,
} from './rowLayout';

type Props = Readonly<{
  'aria-busy'?: boolean;
  children: ReactNode;
  inset: RowInset;
  /** a page's own tokens (`ROW_LOOKS`) */
  look?: RowLook;
  /** the parity checks' name: `data-placeholder` while busy, else `data-slot` */
  name?: string;
  tiles: RowTiles;
  titleId: string;
}>;

/**
 * The row's region, named by its header, and its geometry (rowLayout.ts).
 * The bottom margin takes back the rail's 24px shadow room, so the next
 * section's 64 counts from the cards.
 */
export default function RowFrame({
  'aria-busy': busy,
  children,
  inset,
  look,
  name,
  tiles,
  titleId,
}: Props) {
  const geometry = cn(ROW_INSET[inset], ROW_TILES[tiles], ROW_TILE_WIDTH);
  return (
    <section
      aria-busy={busy}
      aria-labelledby={titleId}
      className="@container -mb-6"
      data-placeholder={busy ? name : undefined}
      data-slot={busy ? undefined : name}
    >
      <div className={geometry}>
        {look ? (
          <div className={ROW_LOOKS[look]} data-row-look={look}>
            {children}
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
