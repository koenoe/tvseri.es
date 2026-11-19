import * as m from 'motion/react-m';

import cn from '@/lib/cn';

import { dayNumber } from '../_lib/calendarDates';
import type { CalendarDayModel } from '../_lib/calendarModel';
import { TODAY_RING } from './calendarStyles';
import PosterStack from './PosterStack';
import TodayFlash from './TodayFlash';

const NUMBER =
  'absolute top-2 left-2.5 text-meta leading-4 font-semibold tabular-nums';

const PULSE_RING = `${TODAY_RING} motion-reduce:hidden`;

/** Today's ring grows to 1.12 and fades once, after the first paint */
const PULSE_FROM = { opacity: 0.9, scale: 1 } as const;
const PULSE_TO = { opacity: 0, scale: 1.12 } as const;
const PULSE_TIMING = { delay: 0.45, duration: 1.1, ease: 'easeOut' } as const;

/**
 * A day on desktop: its number, today's first-paint pulse and Today's
 * flash, and the day's poster stack. Past days and the outside rows keep
 * their posters, dimmed.
 */
export default function CellPosters({
  day,
  flash,
  iso,
  outside,
  past,
  pulse,
}: Readonly<{
  day: CalendarDayModel | undefined;
  flash: number;
  iso: string;
  outside: boolean;
  past: boolean;
  /** Play today's pulse (today, on the first paint only) */
  pulse: boolean;
}>) {
  const numberClass = cn(
    NUMBER,
    // contrast-exempt: another month's dates sit on the month panel (black/22 over the ground), where white/50 is ≥4.8:1
    outside ? 'text-white/50' : past ? 'text-white/60' : 'text-white/85',
  );
  const dim = outside ? 'opacity-35' : past ? 'opacity-40' : undefined;
  return (
    <span className="contents max-md:hidden">
      <span className={numberClass}>{dayNumber(iso)}</span>
      {pulse ? (
        <m.span
          animate={PULSE_TO}
          aria-hidden="true"
          className={PULSE_RING}
          initial={PULSE_FROM}
          transition={PULSE_TIMING}
        />
      ) : null}
      <TodayFlash flash={flash} on="cell" />
      {day ? (
        <span className={dim}>
          <PosterStack day={day} />
        </span>
      ) : null}
    </span>
  );
}
