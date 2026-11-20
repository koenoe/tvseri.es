import cn from '@/lib/cn';

import { dayNumber } from '../_lib/calendarDates';
import type { CalendarDayModel } from '../_lib/calendarModel';
import { DOT_DATE, DOT_ROW, MARK_FILL } from './calendarStyles';
import TodayFlash from './TodayFlash';

/** At most three marks, then +N */
const MOST = 3;

const MARK = {
  episode: 'size-1.5 rounded-full bg-white/50',
  finale: cn('size-2 rounded-full', MARK_FILL.finale),
  premiere: cn('size-2 rounded-full', MARK_FILL.premiere),
} as const;

/** +N in the 10px row beside 8px dots: smaller than every type token */
const MORE = 'text-[10px] leading-[10px] font-semibold tabular-nums';

/**
 * Past and outside days fade their marks only: +N steps down to white/60
 * instead (about 6:1 on the panel), as opacity would take it under 4.5:1
 */
const FADED = 'opacity-40';

/**
 * A day on a phone: the date on top (today a filled white circle, the open
 * day a white ring round it) and one mark per show under it: a small dim
 * dot for an episode, a filled pink dot for a premiere, a cyan ring for a
 * finale; filled or ring and size carry it, not colour alone. Past dates
 * are white/60, the outside rows' white/50 (both ≥4.5:1).
 */
export default function CellDots({
  day,
  flash,
  iso,
  open,
  outside,
  past,
  today,
}: Readonly<{
  day: CalendarDayModel | undefined;
  flash: number;
  iso: string;
  open: boolean;
  outside: boolean;
  past: boolean;
  today: boolean;
}>) {
  const dateClass = cn(
    DOT_DATE,
    'text-white/90',
    past && 'text-white/60',
    // contrast-exempt: another month's dates sit on the month panel (black/22 over the ground), where white/50 is ≥4.8:1
    outside && 'text-white/50',
    open && 'text-white shadow-[inset_0_0_0_2px_rgb(255_255_255/0.85)]',
    // the ×N badge's ground, which has no token
    today && 'bg-white font-bold text-[#121616]',
    today && open && 'shadow-none outline-2 outline-offset-2 outline-white/85',
  );
  const marks = day?.marks ?? [];
  const more = marks.length - MOST;
  const faded = outside || past;
  const moreClass = cn(MORE, faded ? 'text-white/60' : 'text-white/70');
  const markClasses = marks
    .slice(0, MOST)
    .map((mark) => cn(MARK[mark ?? 'episode'], faded && FADED));
  return (
    <span className="contents md:hidden">
      <span className={dateClass}>
        {dayNumber(iso)}
        <TodayFlash flash={flash} on="date" />
      </span>
      {marks.length > 0 ? (
        <span aria-hidden="true" className={DOT_ROW}>
          {markClasses.map((markClass, index) => (
            // the dots repeat (two episodes look the same): their place is the key
            <i className={markClass} key={index} />
          ))}
          {more > 0 ? <b className={moreClass}>+{more}</b> : null}
        </span>
      ) : null}
    </span>
  );
}
