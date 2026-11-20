import {
  chevronLeftGlyph,
  chevronRightGlyph,
} from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import { formatAirWeekdayDate } from '@/lib/format/airDate';

const STEP =
  'relative inline-flex h-8 items-center gap-1 rounded-10 px-2.5 text-caption font-medium text-white/60 tabular-nums transition-[scale,background-color,color] duration-[150ms,100ms,100ms] ease-out after:absolute after:-inset-x-0.5 after:-inset-y-1 hover:bg-white/6 hover:text-white active:scale-96';

/** The popover's foot: ‹ › to the dated day before and after, across months */
export default function DaySteps({
  next,
  now,
  onGo,
  previous,
}: Readonly<{
  next: string | null;
  now: number;
  onGo: (iso: string) => void;
  previous: string | null;
}>) {
  const goPrevious = () => previous && onGo(previous);
  const goNext = () => next && onGo(next);
  return (
    <div className="flex justify-between gap-2">
      {previous ? (
        <button className={STEP} onClick={goPrevious} type="button">
          <Icon glyph={chevronLeftGlyph} size={16} />
          {formatAirWeekdayDate(previous, now)}
        </button>
      ) : (
        <span />
      )}
      {next ? (
        <button className={STEP} onClick={goNext} type="button">
          {formatAirWeekdayDate(next, now)}
          <Icon glyph={chevronRightGlyph} size={16} />
        </button>
      ) : null}
    </div>
  );
}
