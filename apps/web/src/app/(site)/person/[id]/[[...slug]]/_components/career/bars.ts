import type { PersonCareerWeight } from '@tvseri.es/schemas';
import type { CSSProperties } from 'react';

/** Weight = episodes: 2, 4 or 6px (desktop row 30px, phone row 52px) */
export const WEIGHT: Readonly<Record<PersonCareerWeight, string>> = {
  1: 'top-[19px] h-0.5 rounded-[1px] lg:top-3.5',
  2: 'top-[18px] h-1 rounded-2 lg:top-[13px]',
  3: 'top-[17px] h-1.5 rounded-[3px] lg:top-3',
};

/**
 * A bar between two % positions, 1px in from the start and `trim` px short
 * of the end (2 for a series, 1 for announced work)
 */
export const barStyle = (
  start: number,
  end: number,
  trim = 2,
): CSSProperties => ({
  left: `calc(${start}% + 1px)`,
  width: `calc(${end - start}% - ${trim}px)`,
});
