import { format, startOfDay, startOfYear, subMonths, subWeeks } from 'date-fns';

/**
 * A first sync's "How far back": from a day's start (local time), or the
 * whole history. Only the first sync on a connection asks.
 */
export type SyncScopeChoice =
  | Readonly<{ kind: 'since'; since: number }>
  | Readonly<{ kind: 'everything' }>;

export type SinceChoice = Readonly<{ day: number; key: string; label: string }>;

const dayOf = (at: number) => startOfDay(at).getTime();

/** Where the last connection's sync reached; else three months back */
export const defaultSince = (now: number, resumeFrom: number | null) =>
  resumeFrom === null ? dayOf(subMonths(now, 3).getTime()) : dayOf(resumeFrom);

/**
 * The picker's quick days: a week, a month and three months back, and the
 * year's start; after linking again, the last sync's day leads instead of
 * the week
 */
export const sinceChoices = (
  now: number,
  resumeFrom: number | null,
): ReadonlyArray<SinceChoice> => {
  const first: SinceChoice =
    resumeFrom === null
      ? {
          day: dayOf(subWeeks(now, 1).getTime()),
          key: '1w',
          label: '1 week ago',
        }
      : { day: dayOf(resumeFrom), key: 'last', label: 'Last sync' };
  return [
    first,
    {
      day: dayOf(subMonths(now, 1).getTime()),
      key: '1m',
      label: '1 month ago',
    },
    {
      day: dayOf(subMonths(now, 3).getTime()),
      key: '3m',
      label: '3 months ago',
    },
    {
      day: startOfYear(now).getTime(),
      key: 'year',
      label: 'Start of the year',
    },
  ];
};

/** "19 August 2026" */
export const formatSinceDay = (day: number) => format(day, 'd MMMM yyyy');

/** The day button's words: "19 Aug", with the year only when it isn't this one */
export const formatSinceButton = (day: number, now: number) =>
  format(
    day,
    new Date(day).getFullYear() === new Date(now).getFullYear()
      ? 'd MMM'
      : 'd MMM yyyy',
  );

const COUNT = new Intl.NumberFormat('en-GB');

/** The How far back row's line: what the choice reads */
export const sinceLine = (
  scope: SyncScopeChoice,
  resumeFrom: number | null,
  total: number | null,
) => {
  if (scope.kind === 'everything') {
    return total === null
      ? 'Your whole history, in one go.'
      : `All ${COUNT.format(total)} episodes in its history, in one go.`;
  }
  return resumeFrom !== null && scope.since === dayOf(resumeFrom)
    ? 'Carries on from your last sync. Pick an earlier day to read further back.'
    : `From ${formatSinceDay(scope.since)} to today.`;
};
