import { formatDuration } from '@tvseri.es/utils';

import { toPercentage } from '@/lib/marking/progress';

import { formatAirDay } from '../progress/progressLine';

/**
 * The sheet header's progress line: a 4px
 * bar (white = watched; while a season airs, a soft run to the aired share
 * and a tick there) and the label "44% · 21 of 47 watched · 15h left", or
 * "36% · 17 of 47 watched · 24 to watch · next Fri 13 Nov" while airing. The
 * share is of every announced episode.
 */
export type SheetProgress = Readonly<{
  /** Watched share of all episodes, 0–100 (the bar and the label). */
  watchedShare: number;
  /** Aired share, 0–100 (100 for an ended show). */
  airedShare: number;
  /** Airing: a tick at the aired share. */
  tick: boolean;
  /** "44%" */
  percentage: string;
  /** "21 of 47 watched" (phone: "21 of 47") */
  count: string;
  countShort: string;
  /** "15h left", "24 to watch · next Fri 13 Nov", or '' until known. */
  rest: string;
}>;

export function sheetProgress(
  input: Readonly<{
    watched: number;
    aired: number;
    total: number;
    /** Aired, neither watched nor skipped (`openEpisodes`). */
    left: number;
    /** Minutes of those episodes; `null` until loaded. */
    minutesLeft: number | null;
    /** `YYYY-MM-DD` of the next episode to air, while airing. */
    nextAirDate: string | null;
  }>,
): SheetProgress {
  const counted = Math.max(input.total, input.aired);
  const total = Math.max(counted, 1);
  const watchedShare = (input.watched / total) * 100;
  const airing = input.nextAirDate !== null && input.aired < total;
  const airedShare = airing ? (input.aired / total) * 100 : 100;
  const nextDay = airing ? formatAirDay(input.nextAirDate ?? '') : null;
  const rest = airing
    ? [
        input.left > 0 ? `${input.left} to watch` : '',
        nextDay ? `next ${nextDay}` : '',
      ]
        .filter(Boolean)
        .join(' · ')
    : // nothing left (finished) or not known yet: no "0m left"
      input.minutesLeft === null || input.minutesLeft <= 0
      ? ''
      : `${formatDuration(input.minutesLeft)} left`;
  return {
    airedShare,
    count: `${input.watched} of ${counted} watched`,
    countShort: `${input.watched} of ${counted}`,
    percentage: `${toPercentage(input.watched, total)}%`,
    rest,
    tick: airing,
    watchedShare,
  };
}
