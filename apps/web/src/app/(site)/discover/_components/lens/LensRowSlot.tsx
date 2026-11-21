'use client';

import type { ReactNode } from 'react';

import { TAB_ARRIVE } from '@/components/motion/tabArrive';
import { useLens } from './LensProvider';
import useShownArrival from './useShownArrival';

/**
 * Where a tile's row appears when it is open: the row is in the page
 * already (rendered with the hub), so opening it needs no request. It rises
 * in as a lens's tiles do (`useShownArrival`), each time the viewer opens it.
 */
export default function LensRowSlot({
  children,
  row,
}: Readonly<{ children: ReactNode; row: string }>) {
  const open = useLens((state) => state.open === row);
  const arrival = useShownArrival(open);
  const fading = arrival.arriving || undefined;
  const rowId = `${row}-row`;
  return open ? (
    <div
      className="pt-6 md:pt-9"
      data-fade={fading}
      id={rowId}
      onTransitionEnd={arrival.onTransitionEnd}
    >
      <div className={TAB_ARRIVE}>{children}</div>
    </div>
  ) : null;
}
