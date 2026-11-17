'use client';

import * as m from 'motion/react-m';
import type { CSSProperties } from 'react';

import { arrowLeftGlyph, arrowRightGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
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

/** A week's segment, `--seg-inset` in from each side of the week */
const segmentStyle = (week: number): CSSProperties => ({
  left: `calc(${percent(weekPercent(week))} + var(--seg-inset))`,
  width: `calc(${percent(WEEK_WIDTH)} - 2 * var(--seg-inset))`,
});

/** Tick: 2px, ending on the span; dot: centred on the span's end */
const endStyle = (row: TimelineRow): CSSProperties => ({
  left: `calc(${percent(weekPercent(row.end))} - ${row.live ? 4 : 2}px)`,
});

/**
 * The phone's pointers, shown only when the whole line is out of view:
 * before the first week in view (`--from`) or after the last (`--to`).
 */
const BEFORE: CSSProperties = {
  opacity: 'clamp(0, (var(--from) - var(--e)) * 1000 + 1, 1)',
};
const AFTER: CSSProperties = {
  opacity: 'clamp(0, (var(--s) - var(--to)) * 1000 + 1, 1)',
};

/** The lane's colour: the lines fade into it at an edge with more beyond */
const LANE = 'color-mix(in srgb, var(--color-page) 78%, #000)';
const FADE_LEFT: CSSProperties = {
  background: `linear-gradient(90deg, ${LANE}, transparent)`,
};
const FADE_RIGHT: CSSProperties = {
  background: `linear-gradient(270deg, ${LANE}, transparent)`,
};

const POINTER =
  'absolute -top-0.5 inline-flex items-center gap-1 whitespace-nowrap text-caption text-white/60';
const FADE = 'absolute inset-y-0 hidden w-5';

/**
 * A phone's view of the line: the window's width, held at its left edge
 * while the weeks scroll under it. Fades the lines at an edge with more
 * beyond, and says where the line is when it is out of view.
 */
function PhoneWindow({ months }: Readonly<{ months: string }>) {
  return (
    <span className="sticky left-0 block h-4 w-[100cqw] md:hidden">
      <span
        className={cn(FADE, 'left-0 group-data-[fl]/qs:block')}
        style={FADE_LEFT}
      />
      <span
        className={cn(FADE, 'right-0 group-data-[fr]/qs:block')}
        style={FADE_RIGHT}
      />
      <span className={cn(POINTER, 'left-0')} style={BEFORE}>
        <Icon glyph={arrowLeftGlyph} size={12} />
        {months}
      </span>
      <span className={cn(POINTER, 'right-0')} style={AFTER}>
        {months}
        <Icon glyph={arrowRightGlyph} size={12} />
      </span>
    </span>
  );
}

function Track({ row }: Readonly<{ row: TimelineRow }>) {
  const span = spanStyle(row);
  const end = endStyle(row);
  const range = { '--e': row.end, '--s': row.start } as CSSProperties;
  const endClass = row.live
    ? 'absolute top-[3px] -ml-px size-2.5 rounded-full bg-cyan md:top-0.5 md:ml-0.5 md:size-2'
    : 'absolute top-px ml-px h-3.5 w-0.5 rounded-[1px] bg-white/70 md:top-0 md:h-3';
  return (
    <span
      aria-hidden
      className="relative h-4 [--seg-inset:1px] md:col-start-2 md:row-start-1 md:h-3 md:[--seg-inset:0.5px]"
      style={range}
    >
      <span
        className="absolute top-[5px] h-1.5 rounded-[3px] bg-white/12 md:top-1 md:h-1 md:rounded-2"
        style={span}
      />
      {row.weeks.map((week) => (
        <span
          className="absolute top-[5px] h-1.5 rounded-[3px] bg-white md:top-1 md:h-1 md:rounded-2"
          key={week}
          style={segmentStyle(week)}
        />
      ))}
      <span className={endClass} style={end} />
      <PhoneWindow months={row.months} />
    </span>
  );
}

/**
 * One show: title, the track (span between first and last watch, a segment
 * per week watched, the end marker) and its hours. On a phone the title and
 * hours sit above the line and stay put while the weeks scroll under them.
 * Hovering dims the other rows (CSS, `group/tl`); reordering animates the
 * position only.
 * Not `memo`: Motion takes its layout snapshot when the row renders, so a
 * reorder that skips the rows would jump.
 */
export default function TimelineRowView({
  phoneHidden,
  row,
}: Readonly<{ phoneHidden: boolean; row: TimelineRow }>) {
  const className = cn(
    'flex flex-col gap-0.5 py-[7px]',
    'md:grid md:h-[30px] md:grid-cols-[170px_minmax(0,1fr)_56px] md:items-center md:gap-x-4 md:gap-y-[5px] md:rounded-8 md:px-2.5 md:py-0',
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
      <span className="sticky left-0 flex w-[100cqw] items-baseline gap-2.5 md:contents">
        <span className="min-w-0 flex-1 truncate font-semibold text-body-sm text-white">
          {row.title}
        </span>
        <span className="whitespace-nowrap text-right text-caption text-white/60 tabular-nums md:col-start-3 md:row-start-1">
          {row.hours}
        </span>
      </span>
      <Track row={row} />
    </m.div>
  );
}
