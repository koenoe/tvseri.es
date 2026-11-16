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
 * "Every day" (`.st-lane`, STD_Recommended and STMobile): the active-days
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

/** "Less ▢▢▢▢▢ More" (`.st-hmleg`), desktop only */
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

/** The year as 53 week columns with weekday and month labels (desktop) */
function YearHeatmap({
  grid,
  username,
  year,
}: Readonly<{ grid: HeatGrid; username: string; year: number }>) {
  const labelsStyle = { width: grid.columns * 14 };
  const label = `Episodes per day in ${year} for ${username}`;
  const drawing = heatmapSvg({
    cells: grid.cells,
    className: HOVER,
    columns: grid.columns,
    gap: 3,
    label,
    rows: 7,
    size: 11,
  });
  return (
    <div className="flex flex-col gap-2 overflow-x-auto overflow-y-hidden max-md:hidden [&_svg]:block">
      <div className="flex w-max gap-2.5">
        <span className="w-7 shrink-0" />
        <div
          className="relative h-[18px] text-caption text-white/60"
          style={labelsStyle}
        >
          {grid.months.map((month) => (
            <MonthLabel
              column={month.column}
              key={month.label}
              label={month.label}
            />
          ))}
        </div>
      </div>
      <div className="flex w-max gap-2.5">
        <div className="grid w-7 shrink-0 grid-rows-[repeat(7,11px)] gap-[3px] text-caption leading-5 text-white/60">
          {WEEKDAY_LABELS.map((name, index) => (
            <span className="self-center" key={index}>
              {name}
            </span>
          ))}
        </div>
        {drawing}
      </div>
    </div>
  );
}

/** A month name over the week column its 1st falls in (14px per column) */
function MonthLabel({
  column,
  label,
}: Readonly<{ column: number; label: string }>) {
  const style = { left: column * 14 };
  return (
    <span className="absolute top-0" style={style}>
      {label}
    </span>
  );
}

/** STMobile: twelve small months, three across */
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

/**
 * The lane's height: 36 padding, 24 head, 16, the 18 + 8 + 95px chart, 16 and
 * a 20px meta row on desktop; on a phone the twelve months (four rows of up to
 * six weeks) and two meta rows.
 */
export function EveryDaySkeleton() {
  return (
    <LaneGhost className="h-[221px] max-md:h-[598px]" title="Every day">
      <TextLine className="text-caption" width="w-full" />
      <Ghost className="min-h-0 flex-1 rounded-6" />
      <TextLine className="text-meta" width="w-3/4" />
    </LaneGhost>
  );
}
