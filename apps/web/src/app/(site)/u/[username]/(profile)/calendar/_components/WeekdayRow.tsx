import { WEEKDAY_NAMES } from '@/lib/format/months';

import { WEEK } from './calendarStyles';

/** The grid's weeks start on Monday; the names list starts on Sunday */
const WEEKDAYS = [...WEEKDAY_NAMES.slice(1), WEEKDAY_NAMES[0]];

/** "Mon" on desktop, "M" on a phone; the full name for assistive tech */
export default function WeekdayRow() {
  return (
    <div className={WEEK} role="row">
      {WEEKDAYS.map((name) => (
        <div
          className="px-2.5 pb-0.5 text-overline leading-4 text-white/60 uppercase max-md:px-0 max-md:pb-0 max-md:text-center max-md:leading-6"
          key={name}
          role="columnheader"
        >
          <abbr className="no-underline" title={name}>
            <span className="max-md:hidden">{name.slice(0, 3)}</span>
            <span className="md:hidden">{name[0]}</span>
          </abbr>
        </div>
      ))}
    </div>
  );
}
