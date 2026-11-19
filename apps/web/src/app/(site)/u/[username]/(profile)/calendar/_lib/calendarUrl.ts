'use client';

import { useSearchParams } from 'next/navigation';

import { monthOf, parseDay, parseMonth } from './calendarDates';

/**
 * The calendar's place in its URL: `?month=2026-12` (left out for this
 * month) and `?day=2026-12-04` for an open day, so a day can be linked and
 * a reload keeps it. Read by the grid and the sidebar's months alike.
 */
export function useCalendarUrl(today: string) {
  const params = useSearchParams();
  const day = parseDay(params.get('day'));
  const month =
    parseMonth(params.get('month')) ?? (day ? monthOf(day) : monthOf(today));
  return { day: day && monthOf(day) === month ? day : null, month } as const;
}

/**
 * Writes the month and the open day with `replaceState`: no history entry
 * and no request (Next keeps `useSearchParams` in step), so Back still
 * leaves the page
 */
export function writeCalendarUrl(
  today: string,
  month: string,
  day: string | null,
) {
  const url = new URL(window.location.href);
  if (month === monthOf(today) && !day) {
    url.searchParams.delete('month');
  } else {
    url.searchParams.set('month', month);
  }
  if (day) {
    url.searchParams.set('day', day);
  } else {
    url.searchParams.delete('day');
  }
  window.history.replaceState(null, '', url);
}
