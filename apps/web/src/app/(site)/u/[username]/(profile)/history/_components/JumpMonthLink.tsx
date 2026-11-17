'use client';

import * as m from 'motion/react-m';
import Link from 'next/link';
import type { MouseEvent } from 'react';

import cn from '@/lib/cn';

import { plural } from '@/lib/format/text';
import type { JumpMonth } from '@/lib/profile/diary';

const MONTH_IN = { opacity: 0, y: -4 } as const;
const SHOWN = { opacity: 1, y: 0 } as const;
const TRANSITION = { duration: 0.2, ease: [0.2, 0.8, 0.2, 1] } as const;

/**
 * A month in Jump to (`.rl-m`): a link to the diary from that month down.
 * It fades in from 4px up when its year opens; the white fill glides to
 * the month you're reading (200ms; one `layoutId` per
 * list).
 */
export default function JumpMonthLink({
  animate,
  basePath,
  month,
  on,
  onPick,
}: Readonly<{
  /** Fade in (not on the first paint) */
  animate: boolean;
  basePath: string;
  month: JumpMonth;
  on: boolean;
  onPick: (event: MouseEvent<HTMLAnchorElement>) => void;
}>) {
  const href = `${basePath}?month=${month.key}`;
  const label = `${month.title}, ${plural(month.episodes, 'episode')}`;
  const linkClasses = cn(
    'relative ml-6 flex h-[30px] items-center rounded-8 px-3 text-meta text-white/80 transition-colors hover:bg-white/6',
    on && 'font-semibold text-[#171717] hover:bg-transparent',
  );
  const countClasses = cn(
    'relative ml-auto tabular-nums',
    on ? 'font-normal text-[rgb(23_23_23/0.6)]' : 'text-white/60',
  );
  return (
    <m.li
      animate={SHOWN}
      initial={animate ? MONTH_IN : false}
      transition={TRANSITION}
    >
      <Link
        aria-current={on ? 'true' : undefined}
        aria-label={label}
        className={linkClasses}
        href={href}
        onClick={onPick}
      >
        {on ? (
          <m.span
            aria-hidden="true"
            className="absolute inset-0 rounded-8 bg-white"
            layoutId="jump-active-month"
            transition={TRANSITION}
          />
        ) : null}
        <span className="relative">{month.label}</span>
        <span className={countClasses}>{month.episodes}</span>
      </Link>
    </m.li>
  );
}
