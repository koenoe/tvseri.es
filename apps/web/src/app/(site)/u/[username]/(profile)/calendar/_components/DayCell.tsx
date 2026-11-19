'use client';

import * as m from 'motion/react-m';
import { memo } from 'react';

import cn from '@/lib/cn';

import { dayNumber } from '../_lib/calendarDates';
import type { CalendarDayModel } from '../_lib/calendarModel';
import PosterStack from './PosterStack';

/** 112px tall on desktop, 76px on a phone (each day a 44px+ target) */
const CELL =
  'group/cell relative block h-[112px] w-full rounded-12 bg-white/4 text-left max-md:h-[76px] max-md:rounded-10';

/** Presses scale to .96; hover lightens the ground in 100ms */
const PRESSABLE =
  'cursor-pointer transition-[scale,background-color] duration-[150ms,100ms] ease-out hover:bg-white/7 active:scale-96 motion-reduce:active:scale-100';

const NUMBER =
  'absolute top-2 left-2.5 text-[13px] leading-4 font-semibold tabular-nums text-white/85 max-md:inset-x-0 max-md:top-[5px] max-md:text-center max-md:text-[11px] max-md:leading-[14px]';

const TODAY_PILL =
  'absolute top-[7px] right-2 h-[18px] rounded-full bg-white px-1.5 text-[10px] leading-[18px] font-bold tracking-[0.04em] text-[#121616] uppercase max-md:hidden';

/** Today's ring grows to 1.12 and fades once, after the first paint */
const PULSE_FROM = { opacity: 0.9, scale: 1 } as const;
const PULSE_TO = { opacity: 0, scale: 1.12 } as const;
const PULSE_TIMING = { delay: 0.45, duration: 1.1, ease: 'easeOut' } as const;

type Props = Readonly<{
  iso: string;
  /** In the month shown; otherwise one of the grid's outside rows */
  inMonth: boolean;
  /** An outside day that opens: in the calendar, with episodes */
  reachable: boolean;
  day: CalendarDayModel | undefined;
  /** `YYYY-MM` of the grid, on its own days (focus and the popover find them) */
  month: string | undefined;
  past: boolean;
  today: boolean;
  /** The grid's one Tab stop */
  tabbable: boolean;
  /** Its popover or sheet is open */
  open: boolean;
  /** Play today's pulse (the first paint only) */
  pulse: boolean;
  label: string;
}>;

/**
 * One day of the month grid: its number, today's ring and pill, and the
 * day's poster stack. Past days and the outside rows are dimmed but keep
 * their posters; a day you can't open from here (an outside day with
 * nothing, or beyond the calendar) is decoration. The grid handles the
 * presses and keys (`data-day`).
 */
function DayCell({
  day,
  inMonth,
  iso,
  label,
  month,
  open,
  past,
  pulse,
  reachable,
  tabbable,
  today,
}: Props) {
  const outside = !inMonth;
  const stack = day ? (
    <span className={outside ? 'opacity-35' : undefined}>
      <PosterStack day={day} />
    </span>
  ) : null;
  const numberClass = cn(
    NUMBER,
    // contrast-exempt: another month's days frame the grid, as on a printed calendar; each named in full
    outside && 'text-white/30',
    past && inMonth && 'text-white/60',
  );
  const number = <span className={numberClass}>{dayNumber(iso)}</span>;
  if (outside && !reachable) {
    const ghostClass = cn(CELL, 'bg-white/[0.015]');
    return (
      <div aria-hidden="true" className={ghostClass} role="gridcell">
        {number}
        {stack}
      </div>
    );
  }
  const className = cn(
    CELL,
    day && PRESSABLE,
    outside && 'bg-white/[0.015] hover:bg-white/5',
    past && inMonth && 'bg-white/2',
    today && 'shadow-[inset_0_0_0_2px_rgb(255_255_255/0.75)]',
    open && 'bg-white/10 shadow-[inset_0_0_0_2px_#ff0080]',
    !day && 'cursor-default',
  );
  return (
    <div role="gridcell">
      <button
        aria-current={today ? 'date' : undefined}
        aria-expanded={day ? open : undefined}
        aria-haspopup={day ? 'dialog' : undefined}
        aria-label={label}
        className={className}
        data-day={iso}
        data-month={month}
        tabIndex={tabbable ? 0 : -1}
        type="button"
      >
        {number}
        {today ? <span className={TODAY_PILL}>Today</span> : null}
        {today && pulse ? (
          <m.span
            animate={PULSE_TO}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[0_0_0_2px_#fff] motion-reduce:hidden"
            initial={PULSE_FROM}
            transition={PULSE_TIMING}
          />
        ) : null}
        {stack}
      </button>
    </div>
  );
}

const MemoDayCell = memo(DayCell);
MemoDayCell.displayName = 'DayCell';

export default MemoDayCell;
