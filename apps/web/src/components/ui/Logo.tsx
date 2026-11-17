import { LOGO_PATH, LOGO_VIEWBOX } from '@tvseri.es/constants';
import type { SVGProps } from 'react';

import cn from '@/lib/cn';

/**
 * The approved lock-up (the white dot): the TV mark plus `tvseri.es` as Plus Jakarta Sans 800 outlines, in
 * the text colour, drawn from the geometry `apps/auth` shares
 * (`@tvseri.es/constants`). The viewBox is exactly 1em tall, so the size is
 * the height.
 */
const SIZES = {
  18: 'h-[18px] w-[93px]',
  20: 'h-[20px] w-[103.4px]',
  24: 'h-[24px] w-[124.1px]',
} as const;

export type LogoSize = keyof typeof SIZES;

export default function Logo({
  className,
  size,
  ...rest
}: Readonly<
  Omit<SVGProps<SVGSVGElement>, 'children' | 'viewBox'> & {
    /** 24 desktop header, 20 phone header and the sticky pill, 18 footer */
    size: LogoSize;
  }
>) {
  const classes = cn('shrink-0', SIZES[size], className);
  return (
    <svg
      aria-label="tvseri.es"
      className={classes}
      fill="currentColor"
      role="img"
      viewBox={LOGO_VIEWBOX}
      {...rest}
    >
      <g transform="scale(1 -1)">
        <path d={LOGO_PATH} />
      </g>
    </svg>
  );
}
