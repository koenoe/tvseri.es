import type { CSSProperties, ReactNode } from 'react';

import { type TimelineRow, weekPercent } from './model';

const percent = (value: number) => `${value.toFixed(3)}%`;

const at = (start: number, weeks: number): CSSProperties => ({
  left: percent(weekPercent(start)),
  width: percent(weekPercent(weeks)),
});

/** Still watching: 3px of cyan at the line's end */
const liveStyle = (end: number): CSSProperties => ({
  left: `calc(${percent(weekPercent(end))} - 3px)`,
});

function OverviewRow({ row }: Readonly<{ row: TimelineRow }>) {
  const span = at(row.start, row.end - row.start);
  return (
    <span className="relative block h-0.5">
      <i
        className="absolute top-0 h-0.5 rounded-[1px] bg-white/22"
        style={span}
      />
      {row.weeks.map((week) => (
        <i
          className="absolute top-0 h-0.5 rounded-[1px] bg-white/75"
          key={week}
          style={at(week, 1)}
        />
      ))}
      {row.live ? (
        <i
          className="absolute top-0 h-0.5 w-[3px] rounded-[1px] bg-cyan"
          style={liveStyle(row.end)}
        />
      ) : null}
    </span>
  );
}

/**
 * The phone's miniature of the whole year: each listed line at 2px, under
 * the window (`children`) that marks the weeks on screen.
 */
export default function Overview({
  children,
  rows,
}: Readonly<{ children: ReactNode; rows: ReadonlyArray<TimelineRow> }>) {
  return (
    <div className="relative mb-1.5 md:hidden">
      <div aria-hidden className="flex flex-col gap-0.5 py-1.5">
        {rows.map((row) => (
          <OverviewRow key={row.id} row={row} />
        ))}
      </div>
      {children}
    </div>
  );
}
