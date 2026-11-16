import { monthStarts } from '../../_lib/weeks';

/** Desktop only (`.st-tlgrid`): 170px title + 10px padding + 16px gap in, 56px hours + 26px out */
const GRID_INSET = 'left-[196px] right-[82px]';

/**
 * The month header over the rows (`.st-tlhead` / `.st-mtlm`): month names on
 * desktop beside a "Hours" column title, initials across the full width on a
 * phone. Months sit where they start along the 53 weeks.
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
        {months.map(({ at, label }) => {
          const style = { left: `${(at * 100).toFixed(3)}%` };
          return (
            <span
              className="absolute top-0 h-5 whitespace-nowrap border-white/8 border-l pl-[3px] md:pl-1"
              key={label}
              style={style}
            >
              <span className="md:hidden">{label.slice(0, 1)}</span>
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

/** The 12 faint month lines behind the rows (desktop) */
export function MonthGrid({ year }: Readonly<{ year: number }>) {
  const months = monthStarts(year);
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-y-0 ${GRID_INSET} hidden md:block`}
    >
      {months.map(({ at, label }) => {
        const style = { left: `${(at * 100).toFixed(3)}%` };
        return (
          <span
            className="absolute inset-y-0 border-white/4 border-l"
            key={label}
            style={style}
          />
        );
      })}
    </div>
  );
}
