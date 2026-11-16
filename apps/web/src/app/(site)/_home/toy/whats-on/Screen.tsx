'use client';

import type { ReactNode, RefObject } from 'react';

import { PICTURE_LAYER } from '@/components/ui/picture/pictureSurface';
import cn from '@/lib/cn';

import { SCREEN } from './layout';

/**
 * The TV: the backdrops stacked and cross-faded (220ms),
 * the shade, the zap layer and the current channel's caption. Only the
 * `warm` backdrops are mounted.
 */
export default function Screen({
  backdrops,
  caption,
  current,
  warm,
  zapRef,
}: Readonly<{
  backdrops: ReadonlyArray<ReactNode>;
  caption: ReactNode;
  current: number;
  warm: ReadonlySet<number>;
  zapRef: RefObject<HTMLSpanElement | null>;
}>) {
  return (
    <div aria-live="polite" className={SCREEN}>
      {/* the backdrops and the shade: one layer, clipped once by the corners */}
      <span aria-hidden="true" className={PICTURE_LAYER}>
        {backdrops.map((backdrop, index) => {
          const classes = cn(
            'absolute inset-0 opacity-0 transition-opacity duration-220 ease-[ease]',
            index === current && 'opacity-100',
          );
          return warm.has(index) ? (
            <span className={classes} key={index}>
              {backdrop}
            </span>
          ) : null;
        })}
        <span className="absolute inset-0 bg-[linear-gradient(0deg,rgb(10_12_13/0.94)_0%,rgb(10_12_13/0.7)_38%,rgb(10_12_13/0)_78%),linear-gradient(180deg,rgb(0_0_0/0.6)_0%,rgb(0_0_0/0)_30%)]" />
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-4 bg-[repeating-linear-gradient(0deg,rgb(255_255_255/0.13)_0_2px,rgb(0_0_0/0.18)_2px_4px)] opacity-0"
        ref={zapRef}
      />
      {caption}
    </div>
  );
}
