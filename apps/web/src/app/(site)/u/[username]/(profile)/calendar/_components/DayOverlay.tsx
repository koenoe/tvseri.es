'use client';

import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import type { RefObject } from 'react';

import { holdScrollLock } from '@/components/ui/dialog/scrollLock';
import { WIDE } from '@/lib/media/breakpoints';
import useMediaQuery from '@/lib/media/useMediaQuery';

import { monthCells } from '../_lib/calendarDates';
import { type CalendarModel, nearDated } from '../_lib/calendarModel';
import DayPopover from './DayPopover';

const SCRIM_IN = {
  opacity: 1,
  transition: { duration: 0.2, ease: 'easeOut' },
} as const;
const SCRIM_OUT = { opacity: 0, transition: { duration: 0.12 } } as const;
const HIDDEN = { opacity: 0 } as const;

/**
 * The open day from md up: a scrim over the month and the day's popover on
 * its cell (in this month's grid, not the leaving one). ‹ › walk the dated
 * days; moving between them keeps the scrim and the page's scroll lock and
 * swaps the popover.
 */
export default function DayOverlay({
  afterSlide,
  calendar,
  month,
  now,
  onClose,
  onPick,
  openIso,
  stage,
}: Readonly<{
  afterSlide: boolean;
  calendar: CalendarModel;
  month: string;
  now: number;
  onClose: (refocus: boolean) => void;
  onPick: (iso: string) => void;
  openIso: string | null;
  stage: RefObject<HTMLDivElement | null>;
}>) {
  // a phone opens the day as a sheet instead; false on the server and
  // while hydrating, so a link to a day opens it in the browser only
  const wide = useMediaQuery(WIDE);
  const inGrid = openIso !== null && monthCells(month).includes(openIso);
  const day =
    inGrid && wide && openIso ? (calendar.days.get(openIso) ?? null) : null;
  const previous = day ? nearDated(calendar, day.date, -1) : null;
  const next = day ? nearDated(calendar, day.date, 1) : null;
  const cellOf = () =>
    stage.current?.querySelector<HTMLElement>(
      `[data-day="${openIso}"][data-month="${month}"]`,
    ) ?? null;
  return (
    <>
      {/* first: the page is locked (its scroll bar gone) before the popover is placed */}
      {day ? <span hidden ref={holdScrollLock} /> : null}
      <AnimatePresence>
        {day ? (
          <m.div
            animate={SCRIM_IN}
            className="absolute inset-0 z-5 rounded-[20px] bg-[rgb(10_13_14/0.45)]"
            exit={SCRIM_OUT}
            initial={HIDDEN}
            key="scrim"
          />
        ) : null}
        {day ? (
          <DayPopover
            afterSlide={afterSlide}
            cellOf={cellOf}
            day={day}
            key={day.date}
            next={next}
            now={now}
            onClose={onClose}
            onGo={onPick}
            previous={previous}
            stage={stage}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}
