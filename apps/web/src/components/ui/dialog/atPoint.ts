import type { CSSProperties } from 'react';

import { SHEET_EASE } from '@/components/motion/ease';

import type { PanelMotion } from './dialogMotion';

/**
 * A dialog opened from a control sits by it on desktop (phones keep the
 * bottom sheet): the panel takes its place from `--at-top` / `--at-left`,
 * which a wrapper around it sets (`atPointVars`).
 */
export const AT_POINT =
  'sm:mt-(--at-top) sm:ml-(--at-left) sm:self-start sm:justify-self-start';

export type Point = Readonly<{ left: number; top: number }>;
type Size = Readonly<{ height: number; width: number }>;

const MARGIN = 16;

/** `point` moved just enough to keep a `box` 16px inside the viewport */
export function clampToViewport(
  point: Point,
  box: Size,
  viewport: Size,
): Point {
  const clamp = (value: number, max: number) =>
    Math.max(MARGIN, Math.min(value, max));
  return {
    left: clamp(point.left, viewport.width - MARGIN - box.width),
    top: clamp(point.top, viewport.height - MARGIN - box.height),
  };
}

export const atPointVars = (point: Point) =>
  ({
    '--at-left': `${point.left}px`,
    '--at-top': `${point.top}px`,
  }) as CSSProperties;

/**
 * Its motion on desktop: it grows from the control's corner (`origin`,
 * from the panel's top left), 0.96 to full size with a fade, 200ms on the
 * sheet curve; out in 120ms. Phones keep the sheet's rise. With reduced
 * motion the scale snaps and the fade stays.
 */
export const atPointMotion = (origin: Point): PanelMotion => ({
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.2, ease: SHEET_EASE },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: { duration: 0.12, ease: 'easeIn' },
  },
  initial: { opacity: 0, scale: 0.96 },
  style: { originX: `${origin.left}px`, originY: `${origin.top}px` },
});
