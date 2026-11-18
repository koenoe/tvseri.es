'use client';

import type { ReactNode } from 'react';

import { useLens } from './LensProvider';

/**
 * Where a tile's row appears when it is open: the row is in the page
 * already (rendered with the hub), so opening it needs no request.
 */
export default function LensRowSlot({
  children,
  row,
}: Readonly<{ children: ReactNode; row: string }>) {
  const open = useLens((state) => state.open === row);
  const rowId = `${row}-row`;
  return open ? (
    <div
      className="pt-6 md:pt-9 transition-[opacity,translate] duration-450 ease-[cubic-bezier(0.2,0.8,0.2,1)] starting:translate-y-2 starting:opacity-0"
      id={rowId}
    >
      {children}
    </div>
  ) : null;
}
