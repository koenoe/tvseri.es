'use client';

import * as m from 'motion/react-m';
import type { CSSProperties } from 'react';

import cn from '@/lib/cn';

import { type TimelineRow, weekPercent } from './model';

/** Spring 400 / 40 for the "Most hours" re-sort */
const SPRING = { damping: 40, stiffness: 400, type: 'spring' } as const;

const WEEK_WIDTH = weekPercent(1);

const percent = (value: number) => `${value.toFixed(3)}%`;

const spanStyle = (row: TimelineRow): CSSProperties => ({
  left: percent(weekPercent(row.start)),
  width: percent(weekPercent(row.end - row.start)),
});

const segmentStyle = (week: number): CSSProperties => ({
  left: `calc(${percent(weekPercent(week))} + 0.5px)`,
  width: `calc(${percent(WEEK_WIDTH)} - 1px)`,
});

/** Tick: 2px, ending on the span; dot: 8px, centred on the span's end */
const endStyle = (row: TimelineRow): CSSProperties => ({
  left: `calc(${percent(weekPercent(row.end))} - ${row.live ? 4 : 2}px)`,
});

function Track({ row }: Readonly<{ row: TimelineRow }>) {
  const span = spanStyle(row);
  const end = endStyle(row);
  const endClass = row.live
    ? 'absolute top-0.5 ml-0.5 size-2 rounded-full bg-cyan'
    : 'absolute top-0 ml-px h-3 w-0.5 rounded-[1px] bg-white/70';
  return (
    <span className="relative col-span-2 h-3 md:col-span-1 md:col-start-2 md:row-start-1">
      <span className="absolute top-1 h-1 rounded-2 bg-white/12" style={span} />
      {row.weeks.map((week) => (
        <span
          className="absolute top-1 h-1 rounded-2 bg-white"
          key={week}
          style={segmentStyle(week)}
        />
      ))}
      <span className={endClass} style={end} />
    </span>
  );
}

/**
 * One show: title, the track (span between first and last watch, a segment
 * per week watched, the end marker) and its hours. On a phone the title sits
 * above its line, with the hours on its right. Hovering dims the other rows
 * (CSS, `group/tl`); reordering animates the position only.
 * Not `memo`: Motion takes its layout snapshot when the row renders, so a
 * reorder that skips the rows would jump.
 */
export default function TimelineRowView({
  phoneHidden,
  row,
}: Readonly<{ phoneHidden: boolean; row: TimelineRow }>) {
  const className = cn(
    'grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-y-[5px] py-[7px]',
    'md:h-[30px] md:grid-cols-[170px_minmax(0,1fr)_56px] md:items-center md:gap-x-4 md:rounded-8 md:px-2.5 md:py-0',
    'transition-[opacity,background-color] duration-200 md:group-hover/tl:opacity-32 md:hover:bg-white/5 md:hover:opacity-100',
    phoneHidden && 'max-md:hidden',
  );
  return (
    <m.div
      aria-label={row.label}
      className={className}
      layout="position"
      role="img"
      transition={SPRING}
    >
      <span className="min-w-0 truncate font-semibold text-body-sm text-white">
        {row.title}
      </span>
      <span className="text-right text-caption text-white/60 tabular-nums md:col-start-3 md:row-start-1">
        {row.hours}
      </span>
      <Track row={row} />
    </m.div>
  );
}
