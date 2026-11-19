'use client';

import { AnimatePresence, type Variants } from 'motion/react';
import * as m from 'motion/react-m';

import { SHEET_EASE } from '@/components/motion/ease';
import {
  chevronLeftGlyph,
  chevronRightGlyph,
} from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';

import { monthName } from '../_lib/calendarDates';
import { MONTH_HEAD, MONTH_NAV, MONTH_TITLE } from './calendarStyles';

/** The press, the hover and the 40px (44 on a phone) reach of every button here */
const BUTTON =
  'relative inline-flex items-center justify-center rounded-10 bg-white/6 transition-[scale,background-color,color] duration-[150ms,100ms,100ms] ease-out after:absolute after:-inset-0.5 not-disabled:hover:bg-white/10 not-disabled:active:scale-96 max-md:after:-inset-x-1 max-md:after:-inset-y-[5px]';

const ARROW = `${BUTTON} size-9 text-white/85 not-disabled:hover:text-white disabled:opacity-35 max-md:size-[34px]`;

const TODAY = `${BUTTON} mr-1 h-9 px-3 text-[13px] font-medium max-md:hidden`;

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
 * shows · 5 premieres"), then Today (desktop) and ‹ ›. The heading is
 * announced as it changes.
 */
export default function MonthHeader({
  direction,
  headingId,
  month,
  onMonth,
  onToday,
  summary,
  canPrevious,
  canNext,
}: Readonly<{
  canNext: boolean;
  canPrevious: boolean;
  direction: number;
  headingId: string;
  month: string;
  onMonth: (step: -1 | 1) => void;
  onToday: () => void;
  summary: string;
}>) {
  const previous = () => onMonth(-1);
  const next = () => onMonth(1);
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
            <h2
              className="text-[30px] leading-9 font-bold tracking-[-0.02em] text-balance whitespace-nowrap max-md:text-[20px] max-md:leading-7"
              id={headingId}
            >
              {monthName(month)}{' '}
              <span className="font-medium text-white/60">
                {month.slice(0, 4)}
              </span>
            </h2>
            <p className="text-meta leading-5 text-white/60 tabular-nums max-md:text-caption max-md:leading-[18px]">
              {summary}
            </p>
          </m.div>
        </AnimatePresence>
      </div>
      <div className={MONTH_NAV}>
        <button className={TODAY} onClick={onToday} type="button">
          Today
        </button>
        <button
          aria-label="Previous month"
          className={ARROW}
          disabled={!canPrevious}
          onClick={previous}
          type="button"
        >
          <Icon glyph={chevronLeftGlyph} size={16} />
        </button>
        <button
          aria-label="Next month"
          className={ARROW}
          disabled={!canNext}
          onClick={next}
          type="button"
        >
          <Icon glyph={chevronRightGlyph} size={16} />
        </button>
      </div>
    </div>
  );
}
