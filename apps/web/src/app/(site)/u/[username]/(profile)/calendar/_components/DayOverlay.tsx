'use client';

import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { type RefObject, useLayoutEffect, useState } from 'react';

import { monthCells } from '../_lib/calendarDates';
import { type CalendarModel, nearDated } from '../_lib/calendarModel';
import DayPopover from './DayPopover';
import { type PopoverPlace, placePopover } from './placePopover';

const SCRIM_IN = {
  opacity: 1,
  transition: { duration: 0.2, ease: 'easeOut' },
} as const;
const SCRIM_OUT = { opacity: 0, transition: { duration: 0.12 } } as const;
const HIDDEN = { opacity: 0 } as const;

/**
 * The open day from md up: a scrim over the month and the day's popover on
 * its cell (in this month's grid, not the leaving one). ‹ › walk the dated
 * days; moving between them keeps the scrim and swaps the popover.
 */
export default function DayOverlay({
  afterSlide,
  calendar,
  month,
  now,
  onClose,
  onPick,
  openIso,
  phone,
  stage,
}: Readonly<{
  afterSlide: boolean;
  calendar: CalendarModel;
  month: string;
  now: number;
  onClose: (refocus: boolean) => void;
  onPick: (iso: string) => void;
  openIso: string | null;
  /** A phone opens the day as a sheet instead */
  phone: boolean;
  stage: RefObject<HTMLDivElement | null>;
}>) {
  const [place, setPlace] = useState<PopoverPlace | null>(null);

  useLayoutEffect(() => {
    const cell = openIso
      ? stage.current?.querySelector<HTMLElement>(
          `[data-day="${openIso}"][data-month="${month}"]`,
        )
      : null;
    if (!openIso || phone || !cell || !stage.current) {
      setPlace(null);
      return;
    }
    setPlace(
      placePopover(cell, stage.current, monthCells(month).indexOf(openIso)),
    );
  }, [month, openIso, phone, stage]);

  const day =
    openIso && !phone && place ? (calendar.days.get(openIso) ?? null) : null;
  const previous = day ? nearDated(calendar, day.date, -1) : null;
  const next = day ? nearDated(calendar, day.date, 1) : null;
  return (
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
      {day && place ? (
        <DayPopover
          afterSlide={afterSlide}
          day={day}
          key={day.date}
          next={next}
          now={now}
          onClose={onClose}
          onGo={onPick}
          place={place}
          previous={previous}
        />
      ) : null}
    </AnimatePresence>
  );
}
