import { format, startOfDay, startOfYear, subMonths, subYears } from 'date-fns';

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

/** The picker's quick days; after linking again, the last sync's first */
export const sinceChoices = (
  now: number,
  resumeFrom: number | null,
): ReadonlyArray<SinceChoice> => {
  const back: ReadonlyArray<SinceChoice> = [
    {
      day: dayOf(subMonths(now, 3).getTime()),
      key: '3m',
      label: '3 months ago',
    },
    {
      day: dayOf(subMonths(now, 6).getTime()),
      key: '6m',
      label: '6 months ago',
    },
    { day: dayOf(subYears(now, 1).getTime()), key: '1y', label: 'A year ago' },
  ];
  return resumeFrom === null
    ? [
        ...back,
        {
          day: startOfYear(now).getTime(),
          key: 'year',
          label: 'Start of the year',
        },
      ]
    : [{ day: dayOf(resumeFrom), key: 'last', label: 'Last sync' }, ...back];
};

/** "19 August 2026" */
export const formatSinceDay = (day: number) => format(day, 'd MMMM yyyy');

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
