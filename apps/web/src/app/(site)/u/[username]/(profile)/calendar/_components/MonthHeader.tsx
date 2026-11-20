'use client';

import type { ComponentProps } from 'react';

import PageSlide, { PAGE_HEAD } from '@/components/motion/PageSlide';

import { monthName } from '../_lib/calendarDates';
import {
  MONTH_HEAD,
  MONTH_NAME,
  MONTH_SUMMARY,
  MONTH_TITLE,
} from './calendarStyles';
import MonthButtons from './MonthButtons';

const SUMMARY = `${MONTH_SUMMARY} text-white/60 tabular-nums`;

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
        {/* the heading and its count slide 10px up or down with the month */}
        <PageSlide
          className="flex flex-col gap-1"
          direction={direction}
          pageKey={month}
          variants={PAGE_HEAD}
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
        </PageSlide>
      </div>
      <MonthButtons {...buttons} />
    </div>
  );
}
