import type { SVGProps } from 'react';

import type { Glyph, IconSize, ToggleGlyph } from './types';

/**
 * Stroke per size, in viewBox units, so lines stay crisp:
 * 13 and 16px render 1.08 and 1.33px, 20px 1.5px, 24px 1.75px. The odd
 * sizes take the step below: ≤17px 2, 18–21px 1.8, ≥22px 1.75.
 */
const STROKE: Readonly<Record<IconSize, number>> = {
  11: 2,
  12: 2,
  13: 2,
  14: 2,
  15: 2,
  16: 2,
  18: 1.8,
  20: 1.8,
  22: 1.75,
  24: 1.75,
};

type Common = Omit<
  SVGProps<SVGSVGElement>,
  'children' | 'height' | 'viewBox' | 'width'
> &
  Readonly<{
    /** Names the icon for assistive tech. Without it the icon is decorative. */
    label?: string;
    size: IconSize;
  }>;

/** `active` (the filled drawing) only exists on toggle glyphs. */
type Props =
  | (Common & Readonly<{ active?: boolean; glyph: ToggleGlyph }>)
  | (Common & Readonly<{ active?: undefined; glyph: Glyph | ToggleGlyph }>);

/**
 * One line icon from the approved set. `currentColor` throughout, so the text
 * colour (cyan, pink, white/60…) colours it. A server component: no client JS
 * of its own, and only the glyphs a page imports end up in a bundle.
 *
 * @example
 * <Icon glyph={eyeGlyph} size={16} active={isWatched} />
 */
export default function Icon({ active, glyph, label, size, ...rest }: Props) {
  const a11y = label
    ? ({ 'aria-label': label, role: 'img' } as const)
    : ({ 'aria-hidden': true } as const);
  return (
    <svg
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={STROKE[size]}
      viewBox="0 0 24 24"
      width={size}
      {...a11y}
      {...rest}
    >
      {active && glyph.filled ? glyph.filled : glyph.outline}
    </svg>
  );
}
