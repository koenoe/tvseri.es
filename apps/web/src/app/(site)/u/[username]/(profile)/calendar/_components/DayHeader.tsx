import { closeGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';

import { spokenDay } from '../_lib/calendarDates';
import { type CalendarDayModel, daySummary } from '../_lib/calendarModel';

/**
 * The popover's and the sheet's head: the day ("Friday 4 December"), what
 * it holds ("4 shows · 3 premieres") and the close button (a 40px reach)
 */
export default function DayHeader({
  day,
  onClose,
  titleId,
}: Readonly<{
  day: CalendarDayModel;
  onClose: () => void;
  titleId: string;
}>) {
  return (
    <div className="flex items-start justify-between gap-2.5 pt-0.5 pr-0.5 pl-1">
      <div className="flex min-w-0 flex-col">
        <h3
          className="text-[16px] leading-6 font-semibold text-balance"
          id={titleId}
        >
          {spokenDay(day.date)}
        </h3>
        <p className="text-caption text-white/60 tabular-nums">
          {daySummary(day)}
        </p>
      </div>
      <button
        aria-label="Close"
        className="relative inline-flex size-8 shrink-0 items-center justify-center rounded-10 text-white/60 transition-[scale,background-color,color] duration-[150ms,100ms,100ms] ease-out after:absolute after:-inset-1 hover:bg-white/6 hover:text-white active:scale-96 max-md:after:-inset-1.5"
        onClick={onClose}
        type="button"
      >
        <Icon glyph={closeGlyph} size={16} />
      </button>
    </div>
  );
}
