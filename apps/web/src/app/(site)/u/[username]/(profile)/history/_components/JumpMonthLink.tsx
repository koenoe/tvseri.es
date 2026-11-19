'use client';

import { plural } from '@tvseri.es/utils';
import * as m from 'motion/react-m';
import Link from 'next/link';
import { type MouseEvent, memo } from 'react';

import cn from '@/lib/cn';

import type { JumpMonth } from '@/lib/profile/diary';
import { JUMP_MONTH } from './jumpStyles';

const MONTH_IN = { opacity: 0, y: -4 } as const;
const SHOWN = { opacity: 1, y: 0 } as const;
const TRANSITION = { duration: 0.2, ease: [0.2, 0.8, 0.2, 1] } as const;

/**
 * A month in Jump to: a link to the diary from that month down. It fades
 * in from 4px up when its year opens; the white fill glides to the month
 * you're reading (200ms; one `layoutId` per list).
 */
function JumpMonthLink({
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
    'relative text-meta text-white/80 transition-colors hover:bg-white/6',
    JUMP_MONTH,
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

const MemoJumpMonthLink = memo(JumpMonthLink);
MemoJumpMonthLink.displayName = 'JumpMonthLink';

export default MemoJumpMonthLink;
