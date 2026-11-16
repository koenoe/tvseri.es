'use client';

import { type ReactNode, useCallback } from 'react';

import { tileId, useLens } from './LensProvider';
import { lensTileStyles } from './tileStyles';

/**
 * A Duration or Decade tile: opens its row in place under the grid (and
 * closes it again). The chosen tile keeps a 2px white ring.
 */
export default function LensTileButton({
  calm,
  children,
  first,
  label,
  row,
}: Readonly<{
  calm: boolean;
  children: ReactNode;
  first: boolean;
  label: string;
  row: string;
}>) {
  const open = useLens((state) => state.open === row);
  const toggleRow = useLens((state) => state.toggleRow);
  const onClick = useCallback(() => toggleRow(row), [row, toggleRow]);
  const className = lensTileStyles({ calm, first });
  return (
    <button
      aria-controls={open ? `${row}-row` : undefined}
      aria-expanded={open}
      aria-label={label}
      className={className}
      id={tileId(row)}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
