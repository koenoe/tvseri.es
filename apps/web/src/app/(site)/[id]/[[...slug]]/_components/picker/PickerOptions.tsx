import { useCallback } from 'react';

import Badge from '@/components/ui/button/Badge';
import cn from '@/lib/cn';

import type { PickerAnswer, PickerOption } from './pickerModel';

/** 11px uppercase label. */
export const DIALOG_LABEL = 'block text-overline text-white/60 uppercase';

const OPTION = cn(
  'relative flex h-11 cursor-pointer items-center justify-between gap-2 whitespace-nowrap rounded-12 bg-white/5 px-3 text-left text-body-sm font-medium text-white transition-[background-color,box-shadow] duration-150 hover:bg-white/10',
  'aria-pressed:bg-white/12 aria-pressed:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.4)]',
);

const QUICK = cn(
  OPTION,
  // phones: two columns, the date right under the label (the lines' own
  // leading is the space between them), 10px above and below
  'max-sm:h-auto max-sm:flex-col max-sm:items-start max-sm:justify-center max-sm:gap-0 max-sm:py-2.5 max-sm:leading-5',
);

const ALT = cn(
  OPTION,
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
      {option.hint ? (
        <span className="whitespace-nowrap text-meta text-white/60 max-sm:leading-[18px]">
          {option.hint}
        </span>
      ) : null}
    </button>
  );
}

/**
 * The picker's left column (`.dp-l`): When (Just now · Yesterday · Last
 * weekend · On release day, each with its date) and Without a day (I don't
 * remember · Skipped, both New · Not watched when something is set). The
 * current answer is pressed (`dp-on`). A tap applies.
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
      <div
        aria-label="Quick dates"
        className="mb-3 flex flex-col gap-1.5 max-sm:mb-2 max-sm:grid max-sm:grid-cols-2 max-sm:gap-2"
        role="group"
      >
        {quick.map((option) => (
          <Option
            className={QUICK}
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
