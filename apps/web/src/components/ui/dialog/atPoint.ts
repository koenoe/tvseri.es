import type { CSSProperties } from 'react';

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
