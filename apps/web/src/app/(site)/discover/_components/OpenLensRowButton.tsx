'use client';

import { useCallback } from 'react';

import ButtonContent from '@/components/ui/button/ButtonContent';
import { arrowRightGlyph } from '@/components/ui/icon/glyphs';
import scrollBehavior from '@/lib/media/scrollBehavior';

import type { LensKey } from '../_data/hubTiles';
import { OPEN_LENS_ROW_BUTTON } from './hubSectionHead';
import { useLens } from './lens/LensProvider';

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
    document
      .getElementById('lenses')
      ?.scrollIntoView({ behavior: scrollBehavior() });
  }, [lens, openRow, row]);
  return (
    <button className={OPEN_LENS_ROW_BUTTON} onClick={onClick} type="button">
      <ButtonContent icon={arrowRightGlyph} iconSize={16}>
        {children}
      </ButtonContent>
    </button>
  );
}
