import type { SeriesBase } from '@/lib/marking/types';

import { formatAirDay, progressLine } from '../progress/progressLine';

/**
 * The sheet header's progress line: a 4px
 * bar (white = watched; while a season airs, a soft run to the aired share
 * and a tick there) and the label "44% · 21 of 47 watched · 15h left", or
 * "36% · 17 of 47 watched · 24 to watch · next Fri 13 Nov" while airing. The
 * hero's line (`progressLine`) in the sheet's shape, so the two never differ.
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
  series: Pick<SeriesBase, 'seasons' | 'skipped' | 'watched'>,
  options: Readonly<{
    /** Minutes per episode by season; `null` until loaded (no time left yet). */
    runtimes: Readonly<Record<number, ReadonlyArray<number>>> | null;
    /** `YYYY-MM-DD` of the next episode to air, while airing. */
    nextAirDate: string | null;
  }>,
): SheetProgress {
  const line = progressLine(series, {
    nextAirDay: options.nextAirDate ? formatAirDay(options.nextAirDate) : null,
    runtimes: options.runtimes ?? {},
  });
  return {
    airedShare: line.aired * 100,
    count: `${line.count} watched`,
    countShort: line.count,
    percentage: line.percent,
    rest: line.tail,
    tick: line.airing,
    watchedShare: line.watched * 100,
  };
}
