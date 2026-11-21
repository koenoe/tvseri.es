import { HIT_Y } from '@/components/ui/button/hitArea';
import {
  chevronLeftGlyph,
  chevronRightGlyph,
} from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import cn from '@/lib/cn';
import { formatAirWeekdayDate } from '@/lib/format/airDate';

/**
 * ‹ and ›: the chevron's side 2px closer than the text's; 12px corners,
 * concentric in the panel's 26px ones 14px out; 32px tall, 40 to the pointer
 */
const STEP = cn(
  'relative inline-flex h-8 items-center gap-1 rounded-12 px-2.5 has-[>svg:first-child]:pl-2 has-[>svg:last-child]:pr-2 text-caption font-medium text-white/60 tabular-nums transition-[scale,background-color,color] duration-[150ms,100ms,100ms] ease-out hover:bg-white/6 hover:text-white active:scale-96',
  HIT_Y[4],
);

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
          <span className="sr-only">Previous: </span>
          {formatAirWeekdayDate(previous, now)}
        </button>
      ) : (
        <span />
      )}
      {next ? (
        <button className={STEP} onClick={goNext} type="button">
          <span className="sr-only">Next: </span>
          {formatAirWeekdayDate(next, now)}
          <Icon glyph={chevronRightGlyph} size={16} />
        </button>
      ) : null}
    </div>
  );
}
