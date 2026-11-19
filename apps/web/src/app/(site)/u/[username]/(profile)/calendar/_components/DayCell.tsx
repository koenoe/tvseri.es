'use client';

import { memo } from 'react';

import cn from '@/lib/cn';

import type { CalendarDayModel } from '../_lib/calendarModel';
import CellDots from './CellDots';
import CellPosters from './CellPosters';
import { DAY_CELL } from './calendarStyles';

/** Presses scale to .96; on desktop hover lightens the ground in 100ms */
const PRESSABLE =
  'cursor-pointer transition-[scale,background-color] duration-[150ms,100ms] ease-out active:scale-96 motion-reduce:active:scale-100 md:hover:bg-white/7';

/** Desktop: today is a white border; the open day is lifted (a lighter fill and a faint border); both: the border on the fill */
const TODAY = 'md:shadow-[inset_0_0_0_2px_rgb(255_255_255/0.8)]';
const OPEN = 'md:bg-white/10 md:hover:bg-white/10';
const OPEN_EDGE = 'md:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.3)]';

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
  /** The Tab stop's ref, which focuses it when asked */
  focusRef?: (cell: HTMLElement | null) => void;
  /** Its popover or sheet is open */
  open: boolean;
  /** Play today's pulse (the first paint only) */
  pulse: boolean;
  /** Today's presses on this month (0 on every other day) */
  flash: number;
  label: string;
}>;

/**
 * One day of the month grid: on desktop a tile with its poster stack, on a
 * phone the date and a mark per show (both drawn, CSS picks, so the server
 * HTML is right at either width). A day you can't open from here (an
 * outside day with nothing, or beyond the calendar) is decoration. The
 * grid handles the presses and keys (`data-day`).
 */
function DayCell({
  day,
  flash,
  focusRef,
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
  const gone = past && inMonth;
  const pulsing = today && pulse;
  const faces = (
    <>
      <CellPosters
        day={day}
        flash={flash}
        iso={iso}
        outside={outside}
        past={gone}
        pulse={pulsing}
      />
      <CellDots
        day={day}
        flash={flash}
        iso={iso}
        open={open}
        outside={outside}
        past={gone}
        today={today}
      />
    </>
  );
  // an empty cell for assistive tech, so its row keeps seven columns
  if (outside && !reachable) {
    const ghostClass = cn(DAY_CELL, 'md:bg-white/[0.015]');
    return (
      <div role="gridcell">
        <div aria-hidden="true" className={ghostClass}>
          {faces}
        </div>
      </div>
    );
  }
  const className = cn(
    DAY_CELL,
    day ? PRESSABLE : 'cursor-default',
    outside && 'md:bg-white/[0.015] md:hover:bg-white/5',
    gone && 'md:bg-white/2',
    open && OPEN,
    open && !today && OPEN_EDGE,
    today && TODAY,
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
        ref={focusRef}
        tabIndex={tabbable ? 0 : -1}
        type="button"
      >
        {faces}
      </button>
    </div>
  );
}

const MemoDayCell = memo(DayCell);
MemoDayCell.displayName = 'DayCell';

export default MemoDayCell;
