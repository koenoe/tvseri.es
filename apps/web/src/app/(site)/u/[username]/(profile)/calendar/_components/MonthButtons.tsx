import {
  chevronLeftGlyph,
  chevronRightGlyph,
} from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import cn from '@/lib/cn';

import {
  ARROW_BUTTON,
  MONTH_NAV,
  NAV_BUTTON,
  TODAY_BUTTON,
} from './calendarStyles';

const TODAY = cn(NAV_BUTTON, TODAY_BUTTON);
const ARROW = cn(NAV_BUTTON, ARROW_BUTTON, 'disabled:opacity-35');

/**
 * Today (desktop only, always there, so the header never jumps), then ‹ ›.
 * A phone has the arrows alone.
 */
export default function MonthButtons({
  canNext,
  canPrevious,
  onMonth,
  onToday,
  todayLabel,
}: Readonly<{
  canNext: boolean;
  canPrevious: boolean;
  onMonth: (step: -1 | 1) => void;
  onToday: () => void;
  /** "Today, Thursday November 19" */
  todayLabel: string;
}>) {
  const previous = () => onMonth(-1);
  const next = () => onMonth(1);
  return (
    <div className={MONTH_NAV}>
      <button
        aria-label={todayLabel}
        className={TODAY}
        onClick={onToday}
        type="button"
      >
        Today
      </button>
      <button
        aria-label="Previous month"
        className={ARROW}
        disabled={!canPrevious}
        onClick={previous}
        type="button"
      >
        <Icon glyph={chevronLeftGlyph} size={16} />
      </button>
      <button
        aria-label="Next month"
        className={ARROW}
        disabled={!canNext}
        onClick={next}
        type="button"
      >
        <Icon glyph={chevronRightGlyph} size={16} />
      </button>
    </div>
  );
}
