'use client';

import { useCallback } from 'react';

import ButtonContent from '@/components/ui/button/ButtonContent';
import { buttonStyles } from '@/components/ui/button/buttonStyles';
import { arrowRightGlyph } from '@/components/ui/icon/glyphs';

import type { LensKey } from '../_data/hubTiles';
import { useLens } from './lens/LensProvider';

const className = buttonStyles({ className: 'px-4', size: 'sm' });

/**
 * Finish it this weekend's "Under 6 hours": opens that Duration tile's row
 * up in the lenses and scrolls there (the tile has no page of its own). It
 * takes you somewhere, so it leads with the arrow like every navigation
 * button (the row heads beside it have one).
 */
export default function OpenLensRowButton({
  children,
  lens,
  row,
}: Readonly<{ children: string; lens: LensKey; row: string }>) {
  const openRow = useLens((state) => state.openRow);
  const onClick = useCallback(() => {
    openRow(lens, row);
    document.getElementById('lenses')?.scrollIntoView({ behavior: 'smooth' });
  }, [lens, openRow, row]);
  return (
    <button className={className} onClick={onClick} type="button">
      <ButtonContent icon={arrowRightGlyph} iconSize={16}>
        {children}
      </ButtonContent>
    </button>
  );
}
