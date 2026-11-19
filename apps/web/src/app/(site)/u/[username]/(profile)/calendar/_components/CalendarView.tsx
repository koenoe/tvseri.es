'use client';

import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { PHONE } from '@/lib/media/breakpoints';
import useMediaQuery from '@/lib/media/useMediaQuery';

import { addMonths, monthCells, monthOf } from '../_lib/calendarDates';
import {
  buildCalendar,
  type CalendarData,
  coversMonth,
  datedFrom,
  monthSummary,
  nearDated,
  pickDay,
  todayName,
} from '../_lib/calendarModel';
import { useCalendarUrl, writeCalendarUrl } from '../_lib/calendarUrl';
import { MONTH_PANEL } from './calendarStyles';
import DayPopover, { type PopoverPlace } from './DayPopover';
import DaySheet from './DaySheet';
import EmptyMonth from './EmptyMonth';
import Legend from './Legend';
import MonthGrid from './MonthGrid';
import MonthHeader from './MonthHeader';
import { placePopover } from './placePopover';

const SCRIM_IN = {
  opacity: 1,
  transition: { duration: 0.2, ease: 'easeOut' },
} as const;
const SCRIM_OUT = { opacity: 0, transition: { duration: 0.12 } } as const;
const HIDDEN = { opacity: 0 } as const;

/**
 * The calendar: one month at a time (from the URL), its grid, and the open
 * day: a popover on its cell from md up, a bottom sheet on a phone. Every
 * month comes with the page's one read, so ‹ › switch on the client.
 */
export default function CalendarView({
  data,
  noDateYet,
  now,
}: Readonly<{
  data: CalendarData;
  /** How many shows wait under the grid without a date */
  noDateYet: number;
  now: number;
}>) {
  const calendar = useMemo(() => buildCalendar(data), [data]);
  const { today } = calendar;
  const todayMonth = monthOf(today);
  const url = useCalendarUrl(today);
  const month = coversMonth(calendar, url.month) ? url.month : todayMonth;
  const openIso = url.day && calendar.days.has(url.day) ? url.day : null;
  const phone = useMediaQuery(PHONE);
  const headingId = useId();
  // one per month: the leaving month's summary keeps its own while it slides out
  const summaryBase = useId();
  const summaryId = `${summaryBase}${month}`;
  const stage = useRef<HTMLDivElement>(null);

  // which way the grid slides; today's pulse only until the first move
  const [seen, setSeen] = useState({ direction: 1, month, moved: false });
  // Today's presses on this month; a new month starts again (no replay)
  const [flash, setFlash] = useState(0);
  if (seen.month !== month) {
    setSeen({ direction: month > seen.month ? 1 : -1, month, moved: true });
    setFlash(0);
  }

  const [focus, setFocus] = useState<string | null>(null);
  const focusDay =
    focus && monthOf(focus) === month
      ? focus
      : month === todayMonth
        ? today
        : `${month}-01`;
  /** A day to focus once its cell is drawn (keys, Today, a closed popover) */
  const pendingFocus = useRef<string | null>(null);
  const [afterSlide, setAfterSlide] = useState(false);
  const [place, setPlace] = useState<PopoverPlace | null>(null);

  const go = useCallback(
    (nextMonth: string, day: string | null, slide = false) => {
      setAfterSlide(slide);
      writeCalendarUrl(today, nextMonth, day);
    },
    [today],
  );
  const focusOn = (iso: string) => {
    setFocus(iso);
    pendingFocus.current = iso;
  };

  const onPick = useCallback(
    (iso: string) => {
      const pick = pickDay(calendar, month, iso);
      if (pick) {
        setFocus(iso);
        go(pick.month, pick.day, pick.slide);
      }
    },
    [calendar, go, month],
  );
  const onFocusDay = (iso: string) => {
    focusOn(iso);
    if (monthOf(iso) !== month) {
      go(monthOf(iso), null);
    }
  };
  const onMonth = (step: -1 | 1) => go(addMonths(month, step), null);
  // another month: back with the arrows' slide, focus stays on Today and
  // today becomes the grid's Tab stop; this month: focus today, flash it
  const onToday = () => {
    if (month === todayMonth) {
      focusOn(today);
      setFlash((count) => count + 1);
    } else {
      setFocus(today);
    }
    go(todayMonth, null);
  };
  const close = (refocus: boolean) => {
    if (refocus && openIso) {
      focusOn(openIso);
    }
    go(month, null);
  };
  const closeSheet = () => go(month, null);

  // focus follows the keys into the cell once it is drawn (maybe a new month)
  useEffect(() => {
    const iso = pendingFocus.current;
    const cell = iso
      ? stage.current?.querySelector<HTMLElement>(
          `[data-day="${iso}"][data-month="${monthOf(iso)}"]`,
        )
      : null;
    if (cell) {
      pendingFocus.current = null;
      cell.focus();
    }
  });

  // the popover sits on its cell (in this month's grid, not the leaving one)
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
  }, [month, openIso, phone]);

  const openDay = openIso ? (calendar.days.get(openIso) ?? null) : null;
  const sheetDay = phone ? openDay : null;
  const popoverDay = !phone && place ? openDay : null;
  const previous = openIso ? nearDated(calendar, openIso, -1) : null;
  const next = openIso ? nearDated(calendar, openIso, 1) : null;
  const onGo = (iso: string) => onPick(iso);
  const summary = monthSummary(calendar, month);
  const canPrevious = coversMonth(calendar, addMonths(month, -1));
  const canNext = coversMonth(calendar, addMonths(month, 1));
  const emptyAhead = !datedFrom(calendar, month);
  const todayLabel = todayName(calendar);

  return (
    <>
      <div className="relative" data-slot="calendar-month" ref={stage}>
        <section aria-label="Calendar" className={MONTH_PANEL}>
          <MonthHeader
            canNext={canNext}
            canPrevious={canPrevious}
            direction={seen.direction}
            headingId={headingId}
            month={month}
            onMonth={onMonth}
            onToday={onToday}
            summary={summary}
            summaryId={summaryId}
            todayLabel={todayLabel}
          />
          {emptyAhead ? (
            <EmptyMonth month={month} noDateYet={noDateYet} />
          ) : null}
          <MonthGrid
            calendar={calendar}
            describedBy={summaryId}
            direction={seen.direction}
            flash={flash}
            focusDay={focusDay}
            labelledBy={headingId}
            month={month}
            onFocusDay={onFocusDay}
            onPick={onPick}
            openDay={openIso}
            pulse={!seen.moved}
          />
          <Legend />
        </section>
        <AnimatePresence>
          {popoverDay ? (
            <m.div
              animate={SCRIM_IN}
              className="absolute inset-0 z-5 rounded-[20px] bg-[rgb(10_13_14/0.45)]"
              exit={SCRIM_OUT}
              initial={HIDDEN}
              key="scrim"
            />
          ) : null}
        </AnimatePresence>
        <AnimatePresence>
          {popoverDay && place ? (
            <DayPopover
              afterSlide={afterSlide}
              day={popoverDay}
              key={popoverDay.date}
              next={next}
              now={now}
              onClose={close}
              onGo={onGo}
              place={place}
              previous={previous}
            />
          ) : null}
        </AnimatePresence>
      </div>
      <DaySheet day={sheetDay} now={now} onClose={closeSheet} />
    </>
  );
}
