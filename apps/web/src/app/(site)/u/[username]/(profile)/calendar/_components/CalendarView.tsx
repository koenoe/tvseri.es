'use client';

import { useId, useMemo, useRef } from 'react';

import { PHONE } from '@/lib/media/breakpoints';
import useMediaQuery from '@/lib/media/useMediaQuery';

import { addMonths } from '../_lib/calendarDates';
import {
  buildCalendar,
  type CalendarData,
  coversMonth,
  datedFrom,
  monthSummary,
  todayName,
} from '../_lib/calendarModel';
import { useCalendarNav } from '../_lib/useCalendarNav';
import { MONTH_PANEL } from './calendarStyles';
import DayOverlay from './DayOverlay';
import DaySheet from './DaySheet';
import EmptyMonth from './EmptyMonth';
import Legend from './Legend';
import MonthGrid from './MonthGrid';
import MonthHeader from './MonthHeader';

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
  const nav = useCalendarNav(calendar);
  const { month, openIso } = nav;
  const phone = useMediaQuery(PHONE);
  // one per month, as the summary's: the leaving month keeps its own while it slides out
  const headingBase = useId();
  const summaryBase = useId();
  const headingId = `${headingBase}${month}`;
  const summaryId = `${summaryBase}${month}`;
  const stage = useRef<HTMLDivElement>(null);

  const sheetDay =
    phone && openIso ? (calendar.days.get(openIso) ?? null) : null;
  const closeSheet = () => nav.close(false);
  const summary = monthSummary(data, month);
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
            direction={nav.direction}
            headingId={headingId}
            month={month}
            onMonth={nav.onMonth}
            onToday={nav.onToday}
            summary={summary}
            summaryId={summaryId}
            todayLabel={todayLabel}
          />
          {emptyAhead ? (
            <EmptyMonth month={month} noDateYet={noDateYet} />
          ) : null}
          <MonthGrid
            calendar={calendar}
            claimFocus={nav.claimFocus}
            describedBy={summaryId}
            direction={nav.direction}
            flash={nav.flash}
            focusDay={nav.focusDay}
            labelledBy={headingId}
            month={month}
            onFocusDay={nav.onFocusDay}
            onPick={nav.onPick}
            openDay={openIso}
            pulse={!nav.moved}
          />
          <Legend />
        </section>
        <DayOverlay
          afterSlide={nav.afterSlide}
          calendar={calendar}
          month={month}
          now={now}
          onClose={nav.close}
          onPick={nav.onPick}
          openIso={openIso}
          stage={stage}
        />
      </div>
      <DaySheet day={sheetDay} now={now} onClose={closeSheet} />
    </>
  );
}
