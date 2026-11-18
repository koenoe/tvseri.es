'use client';

import type { CSSProperties, MouseEvent } from 'react';

import cn from '@/lib/cn';

import { barHeight, dayName, type WeekDay } from '../_lib/scrobbleWeek';
import {
  WEEK_BAR_CLASS,
  WEEK_BAR_MAX,
  WEEK_CLASS,
  WEEK_DAY_CLASS,
  WEEK_LETTER_CLASS,
} from './layout';
import { useScrobbleWeek } from './ScrobbleWeek';

const DAYS = [0, 1, 2, 3, 4, 5, 6] as const;

/** Until hydration: the seven columns' room, nothing in it */
const RESERVED = (
  <span aria-hidden="true" className={WEEK_CLASS}>
    {DAYS.map((day) => (
      <span className={WEEK_DAY_CLASS} key={day} />
    ))}
  </span>
);

function WeekBar({
  busiest,
  day,
  dimmed,
  onPress,
  selected,
}: Readonly<{
  busiest: number;
  day: WeekDay;
  dimmed: boolean;
  onPress: (event: MouseEvent<HTMLButtonElement>) => void;
  selected: boolean;
}>) {
  const style = {
    '--bar': `${barHeight(day.count, busiest, WEEK_BAR_MAX.desktop)}px`,
    '--bar-sm': `${barHeight(day.count, busiest, WEEK_BAR_MAX.phone)}px`,
  } as CSSProperties;
  const classes = cn(
    WEEK_DAY_CLASS,
    'group/day rounded-6 transition-opacity duration-150 enabled:cursor-pointer',
    dimmed && 'opacity-40 enabled:hover:opacity-70',
  );
  const bar = cn(
    WEEK_BAR_CLASS,
    'h-(--bar) transition-colors duration-150 max-md:h-(--bar-sm)',
    day.isToday
      ? 'bg-cyan'
      : selected
        ? 'bg-white'
        : 'bg-white/28 group-enabled/day:group-hover/day:bg-white/50',
  );
  const letter = cn(
    WEEK_LETTER_CLASS,
    day.isToday || selected ? 'text-white' : 'text-white/60',
  );
  const label = dayName(day);
  const empty = day.count === 0;
  return (
    <button
      aria-label={label}
      aria-pressed={selected}
      className={classes}
      data-day={day.key}
      disabled={empty}
      onClick={onPress}
      type="button"
    >
      <i className={bar} style={style} />
      <span aria-hidden="true" className={letter}>
        {day.letter}
      </span>
    </button>
  );
}

/**
 * Seven bars, one per day of the viewer's last week, as tall as the
 * episodes Plex marked that day. Pressing a day filters the list under the
 * card to it; pressing it again shows the latest marks. A day without marks
 * can't be pressed.
 */
export default function WeekBars() {
  const { days, selected, toggle } = useScrobbleWeek();
  if (!days) {
    return RESERVED;
  }
  const busiest = Math.max(...days.map(({ count }) => count));
  return (
    <div aria-label="Your week on Plex" className={WEEK_CLASS} role="group">
      {days.map((day) => {
        const dimmed = selected !== null && selected !== day.key;
        const isSelected = selected === day.key;
        return (
          <WeekBar
            busiest={busiest}
            day={day}
            dimmed={dimmed}
            key={day.key}
            onPress={toggle}
            selected={isSelected}
          />
        );
      })}
    </div>
  );
}
