'use client';

import type { ReactNode } from 'react';

import type { LensKey } from '../../_data/hubTiles';
import { lensPanelId, lensTabId, useLens } from './LensProvider';
import { LENS_GRID } from './tileStyles';

/**
 * One lens's tile grid. Every lens is in the page already, so a tab switch
 * only shows another grid: no request, same frame. Phones: the first tile
 * full width, then two by two; desktop: the big
 * tile and four (592 · 296 · 296 × 252 · 252).
 * The tab panel of its lens tab, named by it.
 */
export default function LensPanel({
  children,
  lens,
}: Readonly<{ children: ReactNode; lens: LensKey }>) {
  const shown = useLens((state) => state.lens === lens);
  const fade = useLens((state) => state.switched);
  return (
    <div
      aria-labelledby={lensTabId(lens)}
      className={LENS_GRID}
      data-fade={fade || undefined}
      hidden={!shown}
      id={lensPanelId(lens)}
      role="tabpanel"
    >
      {children}
    </div>
  );
}
