'use client';

import { AnimatePresence, type Variants } from 'motion/react';
import * as m from 'motion/react-m';
import type { ComponentProps } from 'react';

import { SHEET_EASE } from '@/components/motion/ease';

import { monthName } from '../_lib/calendarDates';
import {
  MONTH_HEAD,
  MONTH_NAME,
  MONTH_SUMMARY,
  MONTH_TITLE,
} from './calendarStyles';
import MonthButtons from './MonthButtons';

const SUMMARY = `${MONTH_SUMMARY} text-white/60 tabular-nums`;

/** The heading and its count slide 10px up or down with the month */
const HEAD: Variants = {
  center: {
    opacity: 1,
    transition: { duration: 0.24, ease: SHEET_EASE },
    y: 0,
  },
  enter: (direction: number) => ({ opacity: 0, y: direction * 10 }),
  exit: (direction: number) => ({
    opacity: 0,
    transition: { duration: 0.14, ease: 'easeOut' },
    y: direction * -6,
  }),
};

/**
 * The month's name and year, what it holds ("33 episodes this month · 8
 * shows · 5 premieres"; on a phone for screen readers only, as the grid's
 * description), then Today and ‹ ›. The heading is announced as it changes.
 */
export default function MonthHeader({
  direction,
  headingId,
  month,
  summary,
  summaryId,
  ...buttons
}: Readonly<
  {
    direction: number;
    headingId: string;
    month: string;
    summary: string;
    /** The summary's id: the grid's description */
    summaryId: string;
  } & ComponentProps<typeof MonthButtons>
>) {
  return (
    <div className={MONTH_HEAD}>
      <div aria-live="polite" className={MONTH_TITLE}>
        <AnimatePresence custom={direction} initial={false} mode="popLayout">
          <m.div
            animate="center"
            className="flex flex-col gap-1"
            custom={direction}
            exit="exit"
            initial="enter"
            key={month}
            variants={HEAD}
          >
            <h2 className={MONTH_NAME} id={headingId}>
              {monthName(month)}{' '}
              <span className="font-medium text-white/60">
                {month.slice(0, 4)}
              </span>
            </h2>
            <p className={SUMMARY} id={summaryId}>
              {summary}
            </p>
          </m.div>
        </AnimatePresence>
      </div>
      <MonthButtons {...buttons} />
    </div>
  );
}
