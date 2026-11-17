import BarTip from '@/components/ui/chart/BarTip';
import ChartTable from '@/components/ui/chart/ChartTable';
import { SHORT_MONTHS } from '@/lib/format/months';
import { weekLabel } from '@/lib/stats/weeks';
import { weekLinesLayout, weekLinesSvg } from '../../../_components/weekLines';
import { type StreakBracket, weekTitle } from './model';
import grow from './weekGrow.module.css';

type Props = Readonly<{
  /** Episodes per visual week (53) */
  values: ReadonlyArray<number>;
  year: number;
  /** The week in progress, for a year in progress */
  currentWeek?: number;
  bracket: StreakBracket | null;
}>;

/**
 * The 53 week lines (the header, 2px on the phone): the fluid
 * drawing, a hover area per week with its tooltip and highlight (mouse only,
 * the bars are hidden from assistive tech; a visually hidden table stands in
 * for them), the month axis and the streak bracket under it.
 */
export default function WeekChart({
  bracket,
  currentWeek,
  values,
  year,
}: Props) {
  const desktop = weekLinesSvg({
    currentWeek,
    futureStub: 3,
    gap: 13,
    height: 150,
    lineClass: grow.line,
    lineWidth: 3,
    stagger: 8,
    values,
  });
  const phone = weekLinesSvg({
    currentWeek,
    futureStub: 3,
    gap: 4,
    height: 88,
    lineClass: grow.line,
    lineWidth: 2,
    stagger: 8,
    values,
  });
  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative h-[88px] md:h-[150px]">
        <div className="hidden md:block">{desktop}</div>
        <div className="md:hidden">{phone}</div>
        <WeekHits currentWeek={currentWeek} values={values} year={year} />
      </div>
      <MonthAxis />
      {bracket ? <Bracket bracket={bracket} /> : null}
    </div>
  );
}

/** One line's share of the chart height, in permille (the busiest fills it) */
function shares(values: ReadonlyArray<number>, currentWeek?: number) {
  return weekLinesLayout({ currentWeek, height: 1000, stub: 0, values }).map(
    (line) => line.height,
  );
}

function WeekHits({
  currentWeek,
  values,
  year,
}: Readonly<{
  currentWeek?: number;
  values: ReadonlyArray<number>;
  year: number;
}>) {
  const heights = shares(values, currentWeek);
  const rows = values
    .map((episodes, index) => ({
      episodes,
      inFuture: currentWeek !== undefined && index > currentWeek,
      label: weekLabel(year, index),
    }))
    .filter((week) => !week.inFuture);
  return (
    <>
      <ChartTable caption="Episodes per week" rows={rows} />
      <WeekBars
        currentWeek={currentWeek}
        heights={heights}
        values={values}
        year={year}
      />
    </>
  );
}

function WeekBars({
  currentWeek,
  heights,
  values,
  year,
}: Readonly<{
  currentWeek?: number;
  heights: ReadonlyArray<number>;
  values: ReadonlyArray<number>;
  year: number;
}>) {
  return (
    <div aria-hidden className="absolute inset-0 flex gap-1 md:gap-[13px]">
      {values.map((episodes, index) => {
        const inFuture = currentWeek !== undefined && index > currentWeek;
        const key = `${year}-${index}`;
        if (inFuture) {
          return <span aria-hidden className="flex-1" key={key} />;
        }
        return (
          <WeekHit
            episodes={episodes}
            height={heights[index] ?? 0}
            index={index}
            key={key}
            year={year}
          />
        );
      })}
    </div>
  );
}

function WeekHit({
  episodes,
  height,
  index,
  year,
}: Readonly<{
  episodes: number;
  /** Permille of the chart height */
  height: number;
  index: number;
  year: number;
}>) {
  const label = weekLabel(year, index);
  const title = weekTitle(episodes);
  const style = { height: `max(2px, ${height / 10}%)` };
  return (
    <span className="group/bar relative flex flex-1 items-end justify-center">
      <i
        className="absolute bottom-0 hidden w-1 rounded-[3px] bg-white not-italic group-hover/bar:block md:w-[5px]"
        style={style}
      />
      <BarTip title={title}>{label}</BarTip>
    </span>
  );
}

/** Desktop: the twelve months with their tick lines; phone: the initials */
function MonthAxis() {
  return (
    <>
      <div
        aria-hidden
        className="hidden grid-cols-12 text-caption text-white/60 md:grid"
      >
        {SHORT_MONTHS.map((month) => (
          <span className="border-white/8 border-l pl-1" key={month}>
            {month}
          </span>
        ))}
      </div>
      <div
        aria-hidden
        className="flex justify-between text-caption text-white/60 md:hidden"
      >
        {SHORT_MONTHS.map((month) => (
          <span key={month}>{month.charAt(0)}</span>
        ))}
      </div>
    </>
  );
}

function Bracket({ bracket }: Readonly<{ bracket: StreakBracket }>) {
  const span = { left: `${bracket.left}%`, width: `${bracket.width}%` };
  const right = 100 - bracket.left - bracket.width;
  const label = bracket.labelAtEnd
    ? { right: `${right}%` }
    : { left: `${bracket.left}%` };
  return (
    <div aria-hidden className="relative h-9">
      <span
        className="absolute top-1 h-1.5 rounded-b-[4px] border border-white/30 border-t-0"
        style={span}
      />
      <span
        className="absolute top-3.5 whitespace-nowrap text-caption text-white/60"
        style={label}
      >
        {bracket.label}
      </span>
    </div>
  );
}
