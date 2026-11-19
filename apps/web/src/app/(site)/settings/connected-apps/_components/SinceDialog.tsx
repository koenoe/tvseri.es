'use client';

import { format } from 'date-fns';
import { useCallback } from 'react';

import DayCalendar from '@/components/ui/calendar/DayCalendar';
import {
  DIALOG_LABEL,
  PICKER_BODY,
  PICKER_HINT,
  PICKER_QUICK,
  PICKER_QUICK_GROUP,
} from '@/components/ui/calendar/pickerStyles';
import {
  AT_POINT,
  atPointVars,
  type Point,
} from '@/components/ui/dialog/atPoint';
import { Dialog } from '@/components/ui/dialog/Dialog';

import { type SinceChoice, sinceChoices } from '../_lib/syncScope';
import { useConnectedService } from './ServiceContext';

function Choice({
  choice,
  onPick,
  selected,
}: Readonly<{
  choice: SinceChoice;
  onPick: (day: number) => void;
  selected: number;
}>) {
  const pick = useCallback(() => onPick(choice.day), [choice, onPick]);
  return (
    <button
      aria-pressed={choice.day === selected}
      className={PICKER_QUICK}
      onClick={pick}
      type="button"
    >
      <span className="whitespace-nowrap">{choice.label}</span>
      <span className={PICKER_HINT}>{format(choice.day, 'd MMM yyyy')}</span>
    </button>
  );
}

/**
 * "Sync since": the marking picker's shape, its quick days and month grid,
 * for the first sync's day. Future days are off; a tap applies. On desktop
 * it opens under its button (`spot`); phones keep the bottom sheet.
 */
export default function SinceDialog({
  now,
  onOpenChange,
  onPick,
  open,
  resumeFrom,
  selected,
  spot,
}: Readonly<{
  now: number;
  onOpenChange: (open: boolean) => void;
  onPick: (day: number) => void;
  open: boolean;
  resumeFrom: number | null;
  selected: number;
  spot: Point;
}>) {
  const { name } = useConnectedService();
  const pickDay = useCallback((day: Date) => onPick(day.getTime()), [onPick]);
  const choices = sinceChoices(now, resumeFrom);
  const selectedDay = new Date(selected);
  const description = `Your ${name} history from this day on.`;
  const vars = atPointVars(spot);
  return (
    <div className="contents" style={vars}>
      <Dialog
        className={AT_POINT}
        description={description}
        onOpenChange={onOpenChange}
        open={open}
        title="Sync since"
      >
        <div className={PICKER_BODY}>
          <div className="flex min-w-0 flex-col gap-2.5">
            <span className={DIALOG_LABEL}>From</span>
            <div
              aria-label="Quick days"
              className={PICKER_QUICK_GROUP}
              role="group"
            >
              {choices.map((choice) => (
                <Choice
                  choice={choice}
                  key={choice.key}
                  onPick={onPick}
                  selected={selected}
                />
              ))}
            </div>
          </div>
          <DayCalendar
            key={selected}
            now={now}
            onPick={pickDay}
            selected={selectedDay}
          />
        </div>
      </Dialog>
    </div>
  );
}
