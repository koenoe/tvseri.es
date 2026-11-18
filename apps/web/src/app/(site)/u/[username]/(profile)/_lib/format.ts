/**
 * The profile's words for time watched. "Member since" is
 * `@/lib/profile/memberSince`; the day formats are `@/lib/format/calendarDay`
 * ("Nov 8") and `@/lib/format/airDate` ("Sun Nov 15").
 */

import { formatRuntime } from '@tvseri.es/utils';

/**
 * Time watched as the profile writes it: days and hours ("5d 1h",
 * "22d 9h"), minutes only under a day ("3h 50m"). No weeks: the
 * Stats page has its own format ("2w 6d 20h") with its own formatter.
 */
export function formatWatchTime(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  if (total < 24 * 60) {
    return formatRuntime(total) ?? '0m';
  }
  const hours = Math.floor(total / 60);
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  return rest > 0 ? `${days}d ${rest}h` : `${days}d`;
}
