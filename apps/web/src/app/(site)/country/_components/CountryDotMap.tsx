import type { CSSProperties } from 'react';

import cn from '@/lib/cn';

import { dotMapPaths } from '../_data/dotMap/dotMap';
import { type DotMapVariant, WINDOWS } from '../_data/dotMap/grid';

/** The map's box (its exact size, so it never shifts layout) and its fade */
const box = (variant: DotMapVariant, gradient: string): CSSProperties => ({
  height: WINDOWS[variant].height,
  maskImage: gradient,
  WebkitMaskImage: gradient,
  width: WINDOWS[variant].width,
});

/**
 * The radial fades. Desktop masks a 1440 x 1000 layer (ellipse 40%
 * 41% at 60% 47%) whose map starts 80px down; on the 1440 x 600 map that is the
 * same ellipse in px. The phone masks the 390 x 420 map itself.
 */
const BOX: Readonly<Record<DotMapVariant, CSSProperties>> = {
  desktop: box(
    'desktop',
    'radial-gradient(ellipse 576px 410px at 864px 390px,#000 30%,rgba(0,0,0,.55) 62%,rgba(0,0,0,0) 100%)',
  ),
  phone: box(
    'phone',
    'radial-gradient(ellipse 46% 40% at 58% 42%,#000 30%,rgba(0,0,0,.55) 62%,rgba(0,0,0,0) 100%)',
  ),
};

/** Dot diameters: the country's dots, then everyone else's */
const STROKE: Readonly<Record<DotMapVariant, readonly [number, number]>> = {
  desktop: [6, 5],
  phone: [4, 3.5],
};

type Props = Readonly<{
  /** Placement only (e.g. `absolute left-0 top-0 -z-10`); the size is fixed */
  className?: string;
  /** ISO 3166-1 alpha-2, either case */
  code: string;
  variant: DotMapVariant;
}>;

/**
 * The country's dotted world window: the country white,
 * the rest of the world white at 16%, fading out on every side. Decorative and
 * server-rendered: two SVG paths of round-capped dots, no client JS. Renders
 * nothing for a code Natural Earth has no shape for (the hero then has
 * no map; nothing else moves, as the map is out of flow).
 *
 * Placement (the caller's `className`), behind the hero's text:
 * - desktop, 1440 x 600: its top-left 80px below the top of the 1440 page
 *   frame (it starts under the header and runs 60px past the hero into the
 *   first row); the country lands at about x 1114, y 300.
 * - phone, 390 x 420: at the top-left of the screen, under the header.
 */
export default function CountryDotMap({ className, code, variant }: Props) {
  const paths = dotMapPaths(code, variant);
  if (!paths) {
    return null;
  }
  const { height, width } = WINDOWS[variant];
  const [ownWidth, restWidth] = STROKE[variant];
  const viewBox = `0 0 ${width} ${height}`;
  const boxClassName = cn('pointer-events-none', className);
  return (
    <div
      aria-hidden
      className={boxClassName}
      data-dot-map={variant}
      style={BOX[variant]}
    >
      <svg
        className="block"
        focusable="false"
        height={height}
        viewBox={viewBox}
        width={width}
      >
        <path
          className="stroke-white/16"
          d={paths.rest}
          fill="none"
          strokeLinecap="round"
          strokeWidth={restWidth}
        />
        <path
          className="stroke-white"
          d={paths.own}
          fill="none"
          strokeLinecap="round"
          strokeWidth={ownWidth}
        />
      </svg>
    </div>
  );
}
