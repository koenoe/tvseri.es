'use client';

import { AnimatePresence, type Variants } from 'motion/react';
import * as m from 'motion/react-m';
import type { KeyboardEvent, MouseEvent } from 'react';

import { SHEET_EASE } from '@/components/motion/ease';

import {
  addDays,
  monthCells,
  monthOf,
  shiftMonth,
  weekStart,
} from '../_lib/calendarDates';
import {
  type CalendarModel,
  coversMonth,
  dayLabel,
} from '../_lib/calendarModel';
import { WEEK_ROW, WEEKS } from './calendarStyles';
import DayCell from './DayCell';
import WeekdayRow from './WeekdayRow';

/**
 * A month change slides the grid 40px the way you travel and crossfades
 * (in 280ms, out 200ms); the old and new grids overlap, so quick presses
 * interrupt cleanly
 */
const SLIDE: Variants = {
  center: {
    opacity: 1,
    transition: { duration: 0.28, ease: SHEET_EASE },
    x: 0,
  },
  enter: (direction: number) => ({ opacity: 0, x: direction * 40 }),
  exit: (direction: number) => ({
    opacity: 0,
    transition: { duration: 0.2, ease: SHEET_EASE },
    x: direction * -40,
  }),
};

const KEY_STEP: Readonly<Record<string, number>> = {
  ArrowDown: 7,
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -7,
};

/** Where a key moves the focused day: a day, a week, the week's ends, a month */
function keyTarget(iso: string, key: string): string | null {
  const step = KEY_STEP[key];
  if (step !== undefined) {
    return addDays(iso, step);
  }
  if (key === 'Home') {
    return weekStart(iso);
  }
  if (key === 'End') {
    return addDays(weekStart(iso), 6);
  }
  if (key === 'PageUp' || key === 'PageDown') {
    return shiftMonth(iso, key === 'PageUp' ? -1 : 1);
  }
  return null;
}

const dayOf = (target: EventTarget) =>
  target instanceof Element
    ? (target.closest<HTMLElement>('[data-day]')?.dataset.day ?? null)
    : null;

/**
 * The month's six weeks as a grid (`role="grid"`, one Tab stop, roving
 * focus): arrows move a day or a week, Home/End to the week's ends, Page
 * Up/Down a month, Enter or Space opens. Moving past the month's edge goes
 * to that month. A press on a day reports it (`onPick`).
 */
export default function MonthGrid({
  calendar,
  claimFocus,
  describedBy,
  direction,
  flash,
  focusDay,
  labelledBy,
  month,
  onFocusDay,
  onPick,
  openDay,
  pulse,
}: Readonly<{
  calendar: CalendarModel;
  /** The Tab stop's ref: focus lands there once its cell is drawn */
  claimFocus: (cell: HTMLElement | null) => void;
  /** The month's summary */
  describedBy: string;
  direction: number;
  /** Today's presses on this month: today's cell flashes on each */
  flash: number;
  /** The month's Tab stop */
  focusDay: string;
  labelledBy: string;
  month: string;
  /** Keys moved focus to this day (maybe in another month) */
  onFocusDay: (iso: string) => void;
  onPick: (iso: string) => void;
  openDay: string | null;
  pulse: boolean;
}>) {
  const onClick = (event: MouseEvent<HTMLDivElement>) => {
    const iso = dayOf(event.target);
    if (iso) {
      onPick(iso);
    }
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const iso = dayOf(event.target);
    const target = iso ? keyTarget(iso, event.key) : null;
    if (!target) {
      return;
    }
    event.preventDefault();
    if (coversMonth(calendar, monthOf(target))) {
      onFocusDay(target);
    }
  };
  const cells = monthCells(month);
  const weeks = Array.from({ length: 6 }, (_, row) =>
    cells.slice(row * 7, row * 7 + 7),
  );
  return (
    <div
      aria-describedby={describedBy}
      aria-labelledby={labelledBy}
      className={WEEKS}
      onClick={onClick}
      onKeyDown={onKeyDown}
      role="grid"
    >
      <WeekdayRow />
      <div className="relative">
        <AnimatePresence custom={direction} initial={false} mode="popLayout">
          <m.div
            animate="center"
            className={WEEKS}
            custom={direction}
            exit="exit"
            initial="enter"
            key={month}
            variants={SLIDE}
          >
            {weeks.map((week) => (
              <div className={WEEK_ROW} key={week[0]} role="row">
                {week.map((iso) => {
                  const inMonth = monthOf(iso) === month;
                  const day = calendar.days.get(iso);
                  const reachable =
                    !inMonth &&
                    day !== undefined &&
                    coversMonth(calendar, monthOf(iso));
                  const today = iso === calendar.today;
                  const tabbable = iso === focusDay;
                  const label = dayLabel(
                    calendar,
                    iso,
                    reachable ? monthOf(iso) : null,
                  );
                  return (
                    <DayCell
                      day={day}
                      flash={today ? flash : 0}
                      focusRef={tabbable ? claimFocus : undefined}
                      inMonth={inMonth}
                      iso={iso}
                      key={iso}
                      label={label}
                      month={inMonth ? month : undefined}
                      open={iso === openDay}
                      past={iso < calendar.today}
                      pulse={pulse}
                      reachable={reachable}
                      tabbable={tabbable}
                      today={today}
                    />
                  );
                })}
              </div>
            ))}
          </m.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
