import type { ReactNode } from 'react';

import { Ghost, TextLine } from '@/components/ui/ghost/ghosts';
import { bingeGlyph, eyeGlyph, moonGlyph } from '@/components/ui/icon/glyphs';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';

import { getDaily, isUnavailable } from '../../_data/loaders';
import type { SectionProps } from '../types';
import Lane, { LaneGhost } from '../ui/Lane';
import StatsUnavailable from '../ui/StatsUnavailable';
import { heatmapSvg } from './heatmap';
import {
  busiestDayText,
  busiestWeekText,
  type HeatGrid,
  monthGrids,
  STEP_FILLS,
  streakText,
  yearGrid,
} from './model';

const HOVER =
  'shrink-0 [&_rect]:[transition:fill_.12s] [&_rect:hover]:fill-white';
const WEEKDAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'] as const;

/**
 * "Every day": the active-days
 * count and a Less/More legend over a heatmap of the year, then the streak,
 * the busiest day and the busiest week. Desktop draws the year as 53 week
 * columns with month labels; the phone draws twelve small months.
 */
export default async function EveryDay({ user, year }: SectionProps) {
  const daily = await getDaily(user.id, year);
  if (isUnavailable(daily)) {
    return (
      <StatsUnavailable
        id="stats-every-day"
        placeholder={<EveryDaySkeleton />}
        title={'Every day'}
      />
    );
  }
  if (daily.activeDays === 0) {
    return null;
  }
  const grid = yearGrid(year, daily.days);
  const streak = streakText(daily.longestStreak, year);
  const busiestDay = busiestDayText(daily.busiestDay);
  const busiestWeek = busiestWeekText(daily.busiestWeek);
  return (
    <Lane
      aside={LEGEND}
      badge={daily.activeDays}
      className="max-md:p-4"
      id="every-day-title"
      title="Every day"
    >
      <YearHeatmap grid={grid} username={user.username} year={year} />
      <PhoneMonths days={daily.days} year={year} />
      {/* one line: where the column is narrower than the three facts
          (596px beside the sidebar at 1024), the last drop whole */}
      <MetaRow className="max-md:hidden" fit="drop">
        <MetaItem icon={bingeGlyph}>{streak}</MetaItem>
        <MetaItem icon={moonGlyph}>{busiestDay}</MetaItem>
        <MetaItem icon={eyeGlyph}>{busiestWeek}</MetaItem>
      </MetaRow>
      <div className="flex flex-col gap-2 md:hidden">
        <MetaRow>
          <MetaItem icon={bingeGlyph}>{streak}</MetaItem>
        </MetaRow>
        <MetaRow>
          <MetaItem icon={eyeGlyph}>{busiestWeek}</MetaItem>
        </MetaRow>
      </div>
    </Lane>
  );
}

/** "Less ▢▢▢▢▢ More", desktop only */
function Legend() {
  return (
    <span className="ml-auto inline-flex items-center gap-[3px] text-caption text-white/60 max-md:hidden">
      Less
      {STEP_FILLS.map((fill) => (
        <i
          className="block size-2.5 rounded-[3px]"
          key={fill}
          style={{ background: fill }}
        />
      ))}
      More
    </span>
  );
}

/** The legend to the right of the name and the count */
const LEGEND = <Legend />;

/** A day's square and the gap after it on the desktop heatmap */
const CELL = 11;
const GAP = 3;
const PITCH = CELL + GAP;
/** The drawing's height: seven days, Monday to Sunday */
const DRAWING_HEIGHT = 7 * PITCH - GAP;
/**
 * The weeks a year spans (54 only in a leap year that starts on a Sunday,
 * 2040 next): the skeleton's drawing, which can't know the year
 */
const USUAL_WEEKS = 53;

/**
 * The desktop heatmap's frame, shared by the block and its skeleton: a row
 * that scrolls sideways where the column is narrower than the year (a
 * classic scrollbar then takes its room under both), the month row over the
 * week columns, the weekday column beside the drawing.
 */
function YearFrame({
  columns,
  drawing,
  months,
  weekdays,
}: Readonly<{
  columns: number;
  drawing: ReactNode;
  months: ReactNode;
  weekdays: ReactNode;
}>) {
  const monthsStyle = { width: columns * PITCH };
  return (
    <div className="flex flex-col gap-2 overflow-x-auto overflow-y-hidden max-md:hidden [&_svg]:block">
      <div className="flex w-max gap-2.5">
        <span className="w-7 shrink-0" />
        <div
          className="relative h-[18px] text-caption text-white/60"
          style={monthsStyle}
        >
          {months}
        </div>
      </div>
      <div className="flex w-max gap-2.5">
        <div className="grid w-7 shrink-0 grid-rows-[repeat(7,11px)] gap-[3px] text-caption leading-5 text-white/60">
          {weekdays}
        </div>
        {drawing}
      </div>
    </div>
  );
}

const WEEKDAYS = WEEKDAY_LABELS.map((name, index) => (
  <span className="self-center" key={index}>
    {name}
  </span>
));

/** The year as 53 week columns with weekday and month labels (desktop) */
function YearHeatmap({
  grid,
  username,
  year,
}: Readonly<{ grid: HeatGrid; username: string; year: number }>) {
  const label = `Episodes per day in ${year} for ${username}`;
  const drawing = heatmapSvg({
    cells: grid.cells,
    className: HOVER,
    columns: grid.columns,
    gap: GAP,
    label,
    rows: 7,
    size: CELL,
  });
  const months = grid.months.map((month) => (
    <MonthLabel column={month.column} key={month.label} label={month.label} />
  ));
  return (
    <YearFrame
      columns={grid.columns}
      drawing={drawing}
      months={months}
      weekdays={WEEKDAYS}
    />
  );
}

/** A month name over the week column its 1st falls in (14px per column) */
function MonthLabel({
  column,
  label,
}: Readonly<{ column: number; label: string }>) {
  const style = { left: column * PITCH };
  return (
    <span className="absolute top-0" style={style}>
      {label}
    </span>
  );
}

/** Twelve small months, three across */
function PhoneMonths({
  days,
  year,
}: Readonly<{
  days: ReadonlyArray<Readonly<{ date: string; episodes: number }>>;
  year: number;
}>) {
  return (
    <div className="grid grid-cols-3 gap-x-3.5 gap-y-4 md:hidden">
      {monthGrids(year, days).map((month) => (
        <div className="flex min-w-0 flex-col gap-1.5" key={month.label}>
          <span className="text-caption text-white/60">{month.label}</span>
          {heatmapSvg({
            cells: month.cells,
            className: HOVER,
            columns: 7,
            gap: 2,
            label: `${month.label} ${year}`,
            rows: month.rows,
            size: 13,
          })}
        </div>
      ))}
    </div>
  );
}

/** The skeleton's drawing: the year's squares as one block */
const drawingGhostStyle = {
  height: DRAWING_HEIGHT,
  width: USUAL_WEEKS * PITCH - GAP,
};

/**
 * The block while it streams. Desktop: the heatmap's own frame (the same
 * sideways scroller at the year's width, so a scrollbar takes the same room)
 * with a bar for the months and a block for the squares, then the meta row.
 * A phone: the twelve months (four rows of up to six weeks) and two meta
 * rows, 598px with the card's padding.
 */
export function EveryDaySkeleton() {
  return (
    <LaneGhost className="max-md:h-[598px]" title="Every day">
      <YearFrame
        columns={USUAL_WEEKS}
        drawing={
          <Ghost className="shrink-0 rounded-6" style={drawingGhostStyle} />
        }
        months={
          <Ghost className="absolute inset-x-0 top-[3px] h-3 rounded-4" />
        }
        weekdays={null}
      />
      <TextLine className="text-caption md:hidden" width="w-full" />
      <Ghost className="min-h-0 flex-1 rounded-6 md:hidden" />
      <TextLine className="text-meta" width="w-3/4" />
    </LaneGhost>
  );
}
