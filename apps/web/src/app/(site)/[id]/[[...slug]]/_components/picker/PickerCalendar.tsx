'use client';

import { endOfMonth, format } from 'date-fns';
import { useState } from 'react';
import {
  type ChevronProps,
  DayFlag,
  DayPicker,
  type Modifiers,
  SelectionState,
  UI,
} from 'react-day-picker';

import {
  chevronLeftGlyph,
  chevronRightGlyph,
} from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';

import { DIALOG_LABEL } from './PickerOptions';

const NAV =
  'flex size-8 cursor-pointer items-center justify-center rounded-8 text-white/60 transition-colors hover:bg-white/8 hover:text-white aria-disabled:pointer-events-none aria-disabled:opacity-30';

/** The `.dp-*` month grid on react-day-picker's markup (36px cells, 38 on phones). */
const CLASS_NAMES = {
  [UI.Root]: 'w-full',
  [UI.Months]: 'w-full',
  [UI.Month]: 'grid grid-cols-[32px_minmax(0,1fr)_32px] items-center gap-y-2',
  [UI.MonthCaption]: 'flex h-8 items-center justify-center',
  [UI.CaptionLabel]: 'text-body-sm font-semibold',
  [UI.PreviousMonthButton]: NAV,
  [UI.NextMonthButton]: NAV,
  [UI.Chevron]: '',
  // The header row on the days' pitch: thead must span the width too.
  [UI.MonthGrid]: 'col-span-3 block w-full [&>thead]:block',
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

const COMPONENTS = { Chevron };
const FORMATTERS = {
  formatWeekdayName: (date: Date) => format(date, 'EEEEEE'),
};

/**
 * "Or pick a day": the month grid from react-day-picker, weeks
 * from Monday, other months' days faded (no next month's on phones),
 * future days disabled, today ringed, the current day white. A tap applies.
 */
export default function PickerCalendar({
  now,
  onPick,
  selected,
}: Readonly<{
  now: number;
  selected: Date | null;
  onPick: (day: Date) => void;
}>) {
  const [month, setMonth] = useState(() => selected ?? new Date(now));
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
  return (
    <div className="flex min-w-0 flex-col gap-2.5">
      <span className={DIALOG_LABEL}>Or pick a day</span>
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
        onMonthChange={setMonth}
        selected={selected ?? undefined}
        showOutsideDays
        today={today}
        weekStartsOn={1}
      />
    </div>
  );
}
