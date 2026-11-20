'use client';

import { type ReactNode, useState } from 'react';

import useTabArrival from '@/components/motion/useTabArrival';
import type { LensKey } from '../../_data/hubTiles';
import { lensPanelId, lensTabId, useLens } from './LensProvider';
import { LENS_GRID } from './tileStyles';

/**
 * How many times the viewer has switched to this grid. Every lens's grid
 * stays mounted, so each showing needs its own arrival: a grid only settles
 * its own rise, never while hidden. Adjusted while rendering (React's
 * pattern for it), so no effect.
 */
function useShowings(shown: boolean): number {
  const [seen, setSeen] = useState({ showings: 0, shown });
  if (seen.shown !== shown) {
    setSeen({ showings: seen.showings + (shown ? 1 : 0), shown });
  }
  return seen.showings + (shown && !seen.shown ? 1 : 0);
}

/**
 * One lens's tile grid. Every lens is in the page already, so a tab switch
 * only shows another grid: no request, same frame. Phones: the first tile
 * full width, then two by two; desktop: the big
 * tile and four (592 · 296 · 296 × 252 · 252).
 * The tab panel of its lens tab, named by it. Its tiles rise in when the
 * viewer switches to it, as a landing row's tab does (`useTabArrival`):
 * not on the first paint, and not again when Back shows the page.
 */
export default function LensPanel({
  children,
  lens,
}: Readonly<{ children: ReactNode; lens: LensKey }>) {
  const shown = useLens((state) => state.lens === lens);
  const showing = useShowings(shown);
  const arrival = useTabArrival(String(showing));
  const tabId = lensTabId(lens);
  const fading = arrival.arriving || undefined;
  const hidden = !shown;
  const panelId = lensPanelId(lens);
  return (
    <div
      aria-labelledby={tabId}
      className={LENS_GRID}
      data-fade={fading}
      hidden={hidden}
      id={panelId}
      onTransitionEnd={arrival.onTransitionEnd}
      role="tabpanel"
    >
      {children}
    </div>
  );
}
