'use client';

import { endOfMonth, format } from 'date-fns';
import { createContext, use, useState } from 'react';
import {
  type ChevronProps,
  DayFlag,
  DayPicker,
  type Modifiers,
  SelectionState,
  UI,
  type WeeksProps,
} from 'react-day-picker';

import PageSlide from '@/components/motion/PageSlide';

import { HIT_ALL } from '@/components/ui/button/hitArea';
import {
  chevronLeftGlyph,
  chevronRightGlyph,
} from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import cn from '@/lib/cn';

import { DIALOG_LABEL } from './pickerStyles';

/** The month arrows: 32px, 44 to the pointer (only the caption beside them) */
const NAV = cn(
  'relative flex size-8 cursor-pointer items-center justify-center rounded-8 text-white/60 transition-colors hover:bg-white/8 hover:text-white aria-disabled:pointer-events-none aria-disabled:opacity-30',
  HIT_ALL[6],
);

/** The month grid on react-day-picker's markup (36px cells, 38 on phones). */
const CLASS_NAMES = {
  [UI.Root]: 'w-full',
  [UI.Months]: 'w-full',
  [UI.Month]: 'grid grid-cols-[32px_minmax(0,1fr)_32px] items-center gap-y-2',
  [UI.MonthCaption]: 'flex h-8 items-center justify-center',
  [UI.CaptionLabel]: 'text-body-sm font-semibold',
  [UI.PreviousMonthButton]: NAV,
  [UI.NextMonthButton]: NAV,
  [UI.Chevron]: '',
  // The header row on the days' pitch: thead must span the width too. The
  // weeks leaving on a month change slide out over it (`Weeks`).
  [UI.MonthGrid]: 'relative col-span-3 block w-full [&>thead]:block',
  [UI.Weekdays]: 'flex justify-between',
  [UI.Weekday]:
    'w-9 pb-1 text-center text-caption font-normal text-white/60 max-sm:w-[38px]',
  [UI.Weeks]: 'flex flex-col gap-1',
  [UI.Week]: 'flex justify-between',
  [UI.Day]: 'size-9 p-0 text-center max-sm:size-[38px]',
  [UI.DayButton]:
    'size-full cursor-pointer rounded-8 text-body-sm tabular-nums transition-colors hover:bg-white/10',
  [DayFlag.today]: '[&>button]:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.5)]',
  [DayFlag.outside]: 'text-white/60',
  [DayFlag.disabled]:
    // contrast-exempt: disabled days
    'pointer-events-none text-white/15 [&>button]:cursor-default [&>button]:hover:bg-transparent',
  [DayFlag.hidden]: 'invisible',
  [SelectionState.selected]:
    '[&>button]:bg-white [&>button]:text-black/90 [&>button]:shadow-none [&>button]:hover:bg-white',
} as const;

const MODIFIER_CLASSES = { nextMonth: 'max-sm:invisible' } as const;

function Chevron({ orientation }: ChevronProps) {
  const glyph = orientation === 'left' ? chevronLeftGlyph : chevronRightGlyph;
  return <Icon glyph={glyph} size={16} />;
}

/**
 * The picker's column. The weeks sliding 40px sideways are clipped 4px out
 * (a day's focus ring reaches that far), so a dialog never scrolls sideways
 * while they move; up and down nothing is clipped.
 */
const FRAME = '-mx-1 flex min-w-0 flex-col gap-2.5 overflow-x-clip px-1';

/** The month on show and the way the last arrow travelled (1 next, -1 back) */
type Shown = Readonly<{ direction: number; month: Date }>;

const ShownContext = createContext<Shown>({
  direction: 0,
  month: new Date(0),
});

/**
 * The month's weeks: a month change slides them the way you travel, as the
 * profile calendar's months do (`PageSlide`); the weekdays stay
 */
function Weeks({ children, className }: WeeksProps) {
  const { direction, month } = use(ShownContext);
  const key = format(month, 'yyyy-MM');
  return (
    <PageSlide
      as="tbody"
      className={className}
      direction={direction}
      pageKey={key}
    >
      {children}
    </PageSlide>
  );
}

const COMPONENTS = { Chevron, Weeks };
const FORMATTERS = {
  formatWeekdayName: (date: Date) => format(date, 'EEEEEE'),
};

/**
 * "Or pick a day": the month grid from react-day-picker, weeks
 * from Monday, other months' days faded (no next month's on phones),
 * future days disabled, today ringed, the current day white. A tap applies.
 * The arrows slide the weeks the way you travel (`Weeks`).
 * The date pickers' shared grid: marking an episode, a sync's first day.
 */
export default function DayCalendar({
  label = 'Or pick a day',
  now,
  onPick,
  selected,
}: Readonly<{
  label?: string;
  now: number;
  selected: Date | null;
  onPick: (day: Date) => void;
}>) {
  const [shown, setShown] = useState<Shown>(() => ({
    direction: 0,
    month: selected ?? new Date(now),
  }));
  const { month } = shown;
  const changeMonth = (next: Date) =>
    setShown({ direction: next > month ? 1 : -1, month: next });
  const today = new Date(now);
  const disabled = { after: today };
  // Phones end the last row with the month; desktop keeps
  // the next month's days, faded.
  const modifiers = { nextMonth: { after: endOfMonth(month) } };
  const handleDayClick = (day: Date, modifiers: Modifiers) => {
    if (!modifiers.disabled) {
      onPick(day);
    }
  };
  const selectedDay = selected ?? undefined;
  return (
    <div className={FRAME}>
      <span className={DIALOG_LABEL}>{label}</span>
      <ShownContext value={shown}>
        <DayPicker
          classNames={CLASS_NAMES}
          components={COMPONENTS}
          disabled={disabled}
          formatters={FORMATTERS}
          mode="single"
          modifiers={modifiers}
          modifiersClassNames={MODIFIER_CLASSES}
          month={month}
          navLayout="around"
          onDayClick={handleDayClick}
          onMonthChange={changeMonth}
          selected={selectedDay}
          showOutsideDays
          today={today}
          weekStartsOn={1}
        />
      </ShownContext>
    </div>
  );
}
