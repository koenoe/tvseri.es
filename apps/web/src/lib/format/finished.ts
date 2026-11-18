import { formatMonthDay } from './calendarDay';
import { formatMonthYear } from './date';

type FinishedOptions = Readonly<{
  /** "Finished" (the default), or "Caught up" while the season still airs */
  verb?: string;
}>;

/** "Finished Nov 3" this year (UTC day), "Finished Mar 2025" before */
export function finishedLabel(
  finishedAt: number,
  now: number,
  { verb = 'Finished' }: FinishedOptions = {},
): string {
  const year = new Date(finishedAt).getUTCFullYear();
  const when =
    year === new Date(now).getUTCFullYear()
      ? formatMonthDay(finishedAt)
      : formatMonthYear(finishedAt);
  return `${verb} ${when}`;
}
