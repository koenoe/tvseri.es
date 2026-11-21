'use client';

import { formatGrouped, plural } from '@tvseri.es/utils';
import type { MouseEvent } from 'react';
import { useRef } from 'react';
import { usePillGlide } from '@/components/motion/usePillGlide';
import cn from '@/lib/cn';
import { monthName, monthOf } from '../_lib/calendarDates';
import { useCalendarUrl, writeCalendarUrl } from '../_lib/calendarUrl';
import { MONTH_ROW } from './calendarStyles';

const NAV = 'flex flex-col gap-0.5';

export type DatedMonth = Readonly<{ month: string; shows: number }>;

const ROW = cn(
  MONTH_ROW,
  'text-white/85 transition-colors duration-100 ease-out hover:bg-white/6',
);

/** "January 2027" past this year, "November" in it */
const nameOf = (month: string, today: string) =>
  month.slice(0, 4) === today.slice(0, 4)
    ? monthName(month)
    : `${monthName(month)} ${month.slice(0, 4)}`;

/**
 * The sidebar's months: only those with dates, then No date yet. A month
 * opens in the grid without a request (`?month=`, as the grid's ‹ ›); its
 * pill glides there.
 */
export default function MonthsNav({
  months,
  noDateYet,
  today,
}: Readonly<{
  months: ReadonlyArray<DatedMonth>;
  noDateYet: number;
  today: string;
}>) {
  const { month: current } = useCalendarUrl(today);
  const nav = useRef<HTMLElement>(null);
  const glide = usePillGlide(nav, current);
  return (
    <nav aria-label="Months with dates" className={NAV} ref={nav}>
      <h2 className="px-2.5 pb-1.5 text-overline text-white/60 uppercase">
        Months with dates
      </h2>
      {months.map(({ month, shows }) => {
        const on = month === current;
        const open = (event: MouseEvent<HTMLAnchorElement>) => {
          event.preventDefault();
          glide();
          writeCalendarUrl(today, month, null);
        };
        const href = month === monthOf(today) ? '?' : `?month=${month}`;
        const className = cn(ROW, on && 'text-white');
        return (
          <a
            aria-current={on ? 'true' : undefined}
            className={className}
            href={href}
            key={month}
            onClick={open}
          >
            {on ? (
              <span
                aria-hidden="true"
                className="absolute inset-0 rounded-10 bg-white/10"
                data-pill=""
              />
            ) : null}
            <span className="relative">{nameOf(month, today)}</span>
            <span className="relative text-caption text-white/60 tabular-nums">
              {plural(shows, 'show')}
            </span>
          </a>
        );
      })}
      {noDateYet > 0 ? (
        <a className={ROW} href="#no-date-yet">
          <span>No date yet</span>
          <span className="text-caption text-white/60 tabular-nums">
            {formatGrouped(noDateYet)}
          </span>
        </a>
      ) : null}
    </nav>
  );
}
