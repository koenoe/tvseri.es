'use client';

import * as m from 'motion/react-m';

import cn from '@/lib/cn';

import { SHEET_EASE } from './ease';

/** The ring's line: 44 of its 7px circle's 44, so it starts all gap */
const EMPTY = { strokeDashoffset: 44 };
/** Not quite closed: it fills to here and waits */
const FULL = { strokeDashoffset: 6 };
/** Once over the request, on the sheets' curve */
const FILL = { duration: 0.9, ease: SHEET_EASE } as const;

/**
 * A ring that fills once while something is under way (a tray's Save and
 * its loading line, the Remote's pending key): a 7px circle in an 18 or
 * 20px box, its track and its line drawn by the place (`track`, `ink`:
 * stroke classes; the stroke width on the svg's `className`).
 */
export default function FillRing({
  className,
  ink,
  size,
  track,
}: Readonly<{
  /** The svg's own classes: its stroke width, a size from CSS */
  className?: string;
  ink: string;
  size: 18 | 20;
  track: string;
}>) {
  const centre = size / 2;
  const box = `0 0 ${size} ${size}`;
  const classes = cn('shrink-0 -rotate-90 fill-none', className);
  return (
    <svg
      aria-hidden="true"
      className={classes}
      height={size}
      viewBox={box}
      width={size}
    >
      <circle className={track} cx={centre} cy={centre} r="7" />
      <m.circle
        animate={FULL}
        className={ink}
        cx={centre}
        cy={centre}
        initial={EMPTY}
        r="7"
        strokeDasharray="44"
        strokeLinecap="round"
        transition={FILL}
      />
    </svg>
  );
}
