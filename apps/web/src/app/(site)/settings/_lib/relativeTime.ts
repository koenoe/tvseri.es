/**
 * "21:14 today", "Yesterday, 22:40", "Wed, 21:05", "Nov 8, 21:05", "Jan 8, 2025, 21:05": the one ladder
 * for a recent moment, in the viewer's own time zone. Pure (the clock and the
 * zone are arguments) so it is tested without a browser.
 */

import { formatWhen } from '@/lib/format/when';

const timeOf = (at: number, timeZone: string | undefined): string =>
  new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    timeZone,
  }).format(new Date(at));

export type MomentStyle = 'time-first' | 'day-first' | 'at' | 'day';

/**
 * `time-first`: "21:14 today" / "22:40 yesterday" / "21:05 Wed" / "21:05 Jan 8, 2025" (nav
 * lines). `day-first`: "Today, 21:14" / "Yesterday, 22:40" /
 * "Nov 8, 21:05" (lists). `at`: "today at 21:14" / "yesterday at 22:40" /
 * "Nov 8 at 21:05" (a status line: "last scrobble today at 21:14").
 * `day`: the day alone, "today" / "Oct 2" (a date line: "Last import Oct 2").
 */
export function formatMoment(
  at: number,
  now: number,
  style: MomentStyle,
  timeZone?: string,
): string {
  const time = timeOf(at, timeZone);
  const zone = timeZone ?? 'local';
  const label = formatWhen(at, now, { capital: style === 'day-first', zone });
  if (style === 'day') {
    return label;
  }
  if (style === 'at') {
    return `${label} at ${time}`;
  }
  return style === 'time-first' ? `${time} ${label}` : `${label}, ${time}`;
}
