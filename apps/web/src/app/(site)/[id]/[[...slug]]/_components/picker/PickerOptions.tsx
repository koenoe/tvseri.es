import { useCallback } from 'react';

import Badge from '@/components/ui/button/Badge';
import {
  DIALOG_LABEL,
  PICKER_HINT,
  PICKER_OPTION,
  PICKER_QUICK,
  PICKER_QUICK_GROUP,
} from '@/components/ui/calendar/pickerStyles';
import cn from '@/lib/cn';

import type { PickerAnswer, PickerOption } from './pickerModel';

const ALT = cn(
  PICKER_OPTION,
  // phones: each as wide as its label and badge need, sharing the row's
  // spare width (two equal columns cut "I don't remember" and its badge)
  'max-sm:flex-auto max-sm:justify-start max-sm:text-meta max-sm:font-normal',
);

function Option({
  className,
  onPick,
  option,
}: Readonly<{
  option: PickerOption;
  className: string;
  onPick: (answer: PickerAnswer) => void;
}>) {
  const pick = useCallback(() => onPick(option.answer), [onPick, option]);
  return (
    <button
      aria-pressed={option.on}
      className={className}
      onClick={pick}
      type="button"
    >
      <span className="inline-flex flex-none items-center gap-2 whitespace-nowrap">
        {option.label}
        {option.isNew ? <Badge>New</Badge> : null}
      </span>
      {option.hint ? <span className={PICKER_HINT}>{option.hint}</span> : null}
    </button>
  );
}

/**
 * The picker's left column: When (Just now · Yesterday · Last
 * weekend · On release day, each with its date) and Without a day (I don't
 * remember · Skipped, both New · Not watched when something is set). The
 * current answer is pressed. A tap applies.
 */
export default function PickerOptions({
  alt,
  onPick,
  quick,
}: Readonly<{
  quick: ReadonlyArray<PickerOption>;
  alt: ReadonlyArray<PickerOption>;
  onPick: (answer: PickerAnswer) => void;
}>) {
  return (
    <div className="flex min-w-0 flex-col gap-2.5">
      <span className={DIALOG_LABEL}>When</span>
      <div aria-label="Quick dates" className={PICKER_QUICK_GROUP} role="group">
        {quick.map((option) => (
          <Option
            className={PICKER_QUICK}
            key={option.key}
            onPick={onPick}
            option={option}
          />
        ))}
      </div>
      <span className={DIALOG_LABEL}>Without a day</span>
      <div
        aria-label="Without a day"
        className="mb-3 flex flex-col gap-1.5 max-sm:mb-2 max-sm:flex-row max-sm:flex-wrap max-sm:gap-2"
        role="group"
      >
        {alt.map((option) => (
          <Option
            className={ALT}
            key={option.key}
            onPick={onPick}
            option={option}
          />
        ))}
      </div>
    </div>
  );
}
