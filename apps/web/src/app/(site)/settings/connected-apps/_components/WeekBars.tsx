'use client';

import * as m from 'motion/react-m';
import type { CSSProperties, MouseEvent } from 'react';

import { SHEET_EASE } from '@/components/motion/ease';
import cn from '@/lib/cn';
import { brandOf } from '../../_lib/services';
import { barHeight, dayName, type WeekDay } from '../_lib/scrobbleWeek';
import {
  WEEK_BAR_CLASS,
  WEEK_BAR_MAX,
  WEEK_CLASS,
  WEEK_DAY_CLASS,
  WEEK_DAY_REACH_CLASS,
  WEEK_LETTER_CLASS,
} from './layout';
import { useScrobbleWeek } from './ScrobbleWeek';

const DAYS = [0, 1, 2, 3, 4, 5, 6] as const;

/**
 * The bars grow from the floor the first time the card shows them (opened,
 * or scrolled to): 320ms on the sheet curve, 40ms apart. Reduced motion
 * draws them at full height (`MotionProvider`).
 */
const FLOOR = { scaleY: 0 } as const;
const GROWN = { scaleY: 1 } as const;
const ONCE = { once: true } as const;
const growAt = (index: number) =>
  ({ delay: index * 0.04, duration: 0.32, ease: SHEET_EASE }) as const;

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
  index,
  onPress,
  selected,
}: Readonly<{
  busiest: number;
  day: WeekDay;
  dimmed: boolean;
  /** Its place in the week, for the grow's stagger */
  index: number;
  onPress: (event: MouseEvent<HTMLButtonElement>) => void;
  selected: boolean;
}>) {
  const style = {
    '--bar': `${barHeight(day.count, busiest, WEEK_BAR_MAX.desktop)}px`,
    '--bar-sm': `${barHeight(day.count, busiest, WEEK_BAR_MAX.phone)}px`,
  } as CSSProperties;
  // A tap between two bars lands on the nearer day
  const classes = cn(
    WEEK_DAY_CLASS,
    WEEK_DAY_REACH_CLASS,
    'group/day relative rounded-6 transition-opacity duration-150 enabled:cursor-pointer',
    dimmed && 'opacity-40 enabled:hover:opacity-70',
  );
  const bar = cn(
    WEEK_BAR_CLASS,
    'h-(--bar) origin-bottom transition-colors duration-150 max-md:h-(--bar-sm)',
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
  const grow = growAt(index);
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
      <m.i
        className={bar}
        initial={FLOOR}
        style={style}
        transition={grow}
        viewport={ONCE}
        whileInView={GROWN}
      />
      <span aria-hidden="true" className={letter}>
        {day.letter}
      </span>
    </button>
  );
}

/**
 * Seven bars, one per day of the viewer's last week, as tall as the
 * episodes the app marked that day. Pressing a day filters the list under the
 * card to it; pressing it again shows the latest marks. A day without marks
 * can't be pressed.
 */
export default function WeekBars() {
  const { app, days, selected, toggle } = useScrobbleWeek();
  if (!days) {
    return RESERVED;
  }
  const busiest = Math.max(...days.map(({ count }) => count));
  const label = `Your week on ${brandOf(app).name}`;
  return (
    <div aria-label={label} className={WEEK_CLASS} role="group">
      {days.map((day, index) => {
        const dimmed = selected !== null && selected !== day.key;
        const isSelected = selected === day.key;
        return (
          <WeekBar
            busiest={busiest}
            day={day}
            dimmed={dimmed}
            index={index}
            key={day.key}
            onPress={toggle}
            selected={isSelected}
          />
        );
      })}
    </div>
  );
}
