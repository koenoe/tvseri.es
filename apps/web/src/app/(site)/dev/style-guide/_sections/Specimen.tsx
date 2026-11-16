import type { CSSProperties, ReactNode } from 'react';

import cn from '@/lib/cn';

/**
 * A labelled group of primitives in the style guide: what it is and which
 * design it comes from, so it can be compared with the design at real size.
 */
export function Specimen({
  board,
  children,
  className,
  label,
}: Readonly<{
  board: string;
  children: ReactNode;
  className?: string;
  label: string;
}>) {
  const classes = cn('mt-4 flex flex-wrap items-center gap-3', className);
  return (
    <div className="mt-10">
      <p className="text-body-sm font-medium">{label}</p>
      <p className="text-caption text-white/60">{board}</p>
      <div className={classes}>{children}</div>
    </div>
  );
}

/** One state or size under a specimen, with its name beneath. */
export function State({
  children,
  name,
}: Readonly<{ children: ReactNode; name: string }>) {
  return (
    <div className="flex flex-col items-start gap-2">
      {children}
      <span className="text-caption text-white/60">{name}</span>
    </div>
  );
}

// A warm, still-like backdrop (The Bear's tones) for controls drawn on images.
const STILL_STYLE: CSSProperties = {
  backgroundImage:
    'radial-gradient(120% 140% at 20% 10%, #8a6a4a 0%, #4a3a2c 45%, #1d1914 100%)',
};

/** Controls that sit on a still (eye pill, glass buttons, modal tools). */
export function OnStill({
  children,
  className,
}: Readonly<{ children: ReactNode; className?: string }>) {
  const classes = cn(
    'flex flex-wrap items-center gap-3 rounded-12 p-6',
    className,
  );
  return (
    <div className={classes} style={STILL_STYLE}>
      {children}
    </div>
  );
}
