'use client';

import { useCallback, useRef, useState } from 'react';

import { addMonths, monthOf } from './calendarDates';
import { type CalendarModel, coversMonth, pickDay } from './calendarModel';
import { useCalendarUrl, writeCalendarUrl } from './calendarUrl';

/**
 * Where the calendar is: the month and the open day (from the URL), which
 * way the grid last slid, Today's flashes, the grid's Tab stop, and the
 * moves between them. Focus follows the keys, Today and a closed popover
 * into the day's cell once it is drawn: `claimFocus` is the Tab stop's ref.
 */
export function useCalendarNav(calendar: CalendarModel) {
  const { today } = calendar;
  const todayMonth = monthOf(today);
  const url = useCalendarUrl(today);
  const month = coversMonth(calendar, url.month) ? url.month : todayMonth;
  const openIso = url.day && calendar.days.has(url.day) ? url.day : null;

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
  const [afterSlide, setAfterSlide] = useState(false);

  // A day to focus once its cell is drawn, maybe in a month still to come.
  // A new request each time, so the ref is new and runs again on the Tab
  // stop even when that cell is already drawn; each request is taken once.
  const [pendingFocus, setPendingFocus] = useState<Readonly<{
    iso: string;
  }> | null>(null);
  const claimed = useRef<object | null>(null);
  const claimFocus = useCallback(
    (cell: HTMLElement | null) => {
      if (
        cell &&
        pendingFocus &&
        claimed.current !== pendingFocus &&
        cell.dataset.day === pendingFocus.iso
      ) {
        claimed.current = pendingFocus;
        cell.focus();
      }
    },
    [pendingFocus],
  );

  const go = useCallback(
    (nextMonth: string, day: string | null, slide = false) => {
      setAfterSlide(slide);
      writeCalendarUrl(today, nextMonth, day);
    },
    [today],
  );
  const focusOn = (iso: string) => {
    setFocus(iso);
    setPendingFocus({ iso });
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
  /** Closes the open day; `refocus` (Esc, ✕) gives focus back to its cell */
  const close = (refocus: boolean) => {
    if (refocus && openIso) {
      focusOn(openIso);
    }
    go(month, null);
  };

  return {
    afterSlide,
    claimFocus,
    close,
    direction: seen.direction,
    flash,
    focusDay,
    month,
    moved: seen.moved,
    onFocusDay,
    onMonth,
    onPick,
    onToday,
    openIso,
  } as const;
}
