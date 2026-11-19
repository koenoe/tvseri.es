import { Ghost, PULSE, TextLine } from '@/components/ui/ghost/ghosts';
import { GHOST_FILL } from '@/components/ui/row/RowGhosts';
import cn from '@/lib/cn';

import { ShowAllGhost } from '../../_components/blocks/LaneGhost';
import SubpageHeader from '../../_components/subpage/SubpageHeader';
import {
  CALENDAR_PAGE,
  MONTH_HEAD,
  MONTH_NAV,
  MONTH_PANEL,
  MONTH_TITLE,
  NO_DATE_PANEL,
  NO_DATE_TILE,
  NO_DATE_TILES,
  WEEK,
  WEEKS,
} from './calendarStyles';
import Legend from './Legend';
import WeekdayRow from './WeekdayRow';

const COUNT = cn('inline-block h-3 w-44 rounded-6', GHOST_FILL, PULSE);

/** A day: the cell's ground and its number, no posters */
const CELL =
  'relative block h-[112px] rounded-12 bg-white/4 max-md:h-[76px] max-md:rounded-10';
const NUMBER = cn(
  'absolute top-2.5 left-2.5 h-3.5 w-4 rounded-4 max-md:top-1.5 max-md:left-1/2 max-md:-ml-2 max-md:h-3',
  GHOST_FILL,
);

const CELLS = Array.from({ length: 6 }, (_, row) =>
  Array.from({ length: 7 }, (_, column) => row * 7 + column),
);

function MonthGhost() {
  return (
    <div className="relative" data-placeholder="calendar-month">
      <div className={MONTH_PANEL}>
        <div className={MONTH_HEAD}>
          <div className={MONTH_TITLE}>
            <div className="flex flex-col gap-1">
              <TextLine
                bar="h-7"
                className="text-[30px] leading-9 max-md:text-[20px] max-md:leading-7"
                width="w-52"
              />
              <TextLine
                className="text-meta leading-5 max-md:text-caption max-md:leading-[18px]"
                width="w-64"
              />
            </div>
          </div>
          <div className={MONTH_NAV}>
            <Ghost className="mr-1 h-9 w-[62px] rounded-10 max-md:hidden" />
            <Ghost className="size-9 rounded-10 max-md:size-[34px]" />
            <Ghost className="size-9 rounded-10 max-md:size-[34px]" />
          </div>
        </div>
        <div className={WEEKS}>
          <WeekdayRow />
          <div className={WEEKS}>
            {CELLS.map((week) => (
              <div className={WEEK} key={week[0]}>
                {week.map((cell) => (
                  <span className={CELL} key={cell}>
                    <span className={NUMBER} />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
        <Legend />
      </div>
    </div>
  );
}

function TileGhost() {
  return (
    <span className={NO_DATE_TILE}>
      <Ghost className="h-[60px] w-10 shrink-0 rounded-6" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <TextLine className="text-body-sm leading-[22px]" width="w-28" />
        <TextLine className="text-caption leading-[18px]" width="w-24" />
        <TextLine className="text-caption leading-[18px]" width="w-28" />
      </span>
    </span>
  );
}

function RuleGhost() {
  return (
    <span className="flex h-5 items-center gap-2.5 px-0.5">
      <TextLine className="text-overline" width="w-36" />
      <i className="h-px flex-1 bg-white/10" />
    </span>
  );
}

const tiles = (count: number) =>
  Array.from({ length: count }, (_, index) => <TileGhost key={index} />);

/** No date yet: a group of three, then the first five and the foot */
function NoDateGhost() {
  return (
    <div className={NO_DATE_PANEL}>
      <div className="flex flex-wrap items-center gap-2.5">
        <TextLine className="text-title-3" width="w-28" />
        <Ghost className="h-5.5 w-7 rounded-full" />
      </div>
      <div className="flex flex-col gap-3">
        <RuleGhost />
        <div className={NO_DATE_TILES}>{tiles(3)}</div>
        <RuleGhost />
        <div className="flex flex-col gap-2.5">
          <div className={NO_DATE_TILES}>{tiles(5)}</div>
          <ShowAllGhost />
        </div>
      </div>
    </div>
  );
}

/**
 * The calendar before it streams in, drawn from nothing but its shape: the
 * header, the month panel (its heading and buttons as ghosts, the weekday
 * names real, the 42 days as empty cells, the legend) and No date yet's
 * ghost. Six weeks always, so the month lands without a shift.
 */
export default function CalendarSkeleton() {
  const count = <span className={COUNT} />;
  return (
    <div
      aria-hidden="true"
      className={CALENDAR_PAGE}
      data-placeholder="calendar"
    >
      <SubpageHeader className="max-md:hidden" count={count} title="Calendar" />
      <div className={PULSE}>
        <MonthGhost />
      </div>
      <div className={PULSE}>
        <NoDateGhost />
      </div>
    </div>
  );
}
