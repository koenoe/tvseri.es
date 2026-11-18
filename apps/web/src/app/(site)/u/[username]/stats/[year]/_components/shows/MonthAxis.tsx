import { monthName, monthStarts } from '@/lib/stats/weeks';

/**
 * Desktop: 170px title + 10px padding + 16px gap in, 56px hours + 26px out.
 * A phone's grid spans its whole year track.
 */
const GRID_INSET = 'inset-x-0 md:left-[196px] md:right-[82px]';

const MONTH_GRID = `pointer-events-none absolute inset-y-0 ${GRID_INSET}`;

/**
 * The month header over the rows: month names on desktop beside a "Hours"
 * column title, full names along a phone's year track. Months sit where they
 * start along the 53 weeks.
 */
export function MonthAxis({ year }: Readonly<{ year: number }>) {
  const months = monthStarts(year);
  return (
    <div
      aria-hidden
      className="grid md:grid-cols-[170px_minmax(0,1fr)_56px] md:items-end md:gap-4 md:px-2.5 md:pb-2.5"
    >
      <span className="hidden md:block" />
      <span className="relative block h-5 text-caption text-white/60">
        {months.map(({ at, label }, month) => {
          const style = { left: `${(at * 100).toFixed(3)}%` };
          return (
            <span
              className="absolute top-0 h-5 whitespace-nowrap border-white/14 border-l pl-1 md:border-white/8"
              key={label}
              style={style}
            >
              <span className="md:hidden">{monthName(month)}</span>
              <span className="hidden md:inline">{label}</span>
            </span>
          );
        })}
      </span>
      <span className="hidden text-right font-semibold text-overline text-white/60 uppercase md:block">
        Hours
      </span>
    </div>
  );
}

/** The 12 faint month lines behind the rows */
export function MonthGrid({ year }: Readonly<{ year: number }>) {
  const months = monthStarts(year);
  return (
    <div aria-hidden className={MONTH_GRID}>
      {months.map(({ at, label }) => {
        const style = { left: `${(at * 100).toFixed(3)}%` };
        return (
          <span
            className="absolute inset-y-0 border-white/5 border-l md:border-white/4"
            key={label}
            style={style}
          />
        );
      })}
    </div>
  );
}
