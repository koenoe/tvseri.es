import { formatAirWeekdayDate } from '@/lib/format/airDate';
import type { WatchRecord } from '@/lib/marking/types';

import { formatWatchedAt } from '../episodes/format';
import type { ChipState } from './chips';

/**
 * What one episode's chip says about it:
 * "Today, 21:40", "Mon 9 Nov, 21:40", "Don’t remember when", "Skipped",
 * "Airs Fri 13 Nov" or "Not watched".
 */
export function chipStatus(
  state: ChipState,
  record: WatchRecord | undefined,
  airDate: string | undefined,
  now: number,
): string {
  if (state === 'nd') {
    return 'Don’t remember when';
  }
  if (state === 'w' && record) {
    return formatWatchedAt(record.watchedAt, now);
  }
  if (state === 'sk') {
    return 'Skipped';
  }
  if (state === 'na') {
    const day = airDate ? formatAirWeekdayDate(airDate, now) : '';
    return day ? `Airs ${day}` : 'Not aired yet';
  }
  return 'Not watched';
}

/** A chip's tooltip and accessible name: "S02E05 Pop · Not watched". */
export function chipTitle(
  name: string,
  state: ChipState,
  status: string,
  upTo: boolean,
): string {
  const said = state === 'nd' ? 'Watched · don’t remember when' : status;
  return `${name} · ${said}${upTo ? ' · I’m up to here' : ''}`;
}
