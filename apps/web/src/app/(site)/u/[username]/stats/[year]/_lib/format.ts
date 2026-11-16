/**
 * Number and time formats of the Stats page and its share card. Their own
 * names: the Stats board writes time its own way ("2w 6d 20h", "36h"),
 * unlike `formatDuration` and the landings' `formatHours`.
 */

const MINUTES_PER_DAY = 24 * 60;
const MINUTES_PER_WEEK = 7 * MINUTES_PER_DAY;

/**
 * "2w 6d 20h" (the total runtime tile, the sentence, the card): weeks, days
 * and hours, rounded to the hour. With `showMinutes`, "13h 45m".
 */
export function formatStatsRuntime(
  minutes: number,
  showMinutes = false,
): string {
  const total = showMinutes
    ? Math.round(minutes)
    : Math.round(minutes / 60) * 60;
  const weeks = Math.floor(total / MINUTES_PER_WEEK);
  const days = Math.floor((total % MINUTES_PER_WEEK) / MINUTES_PER_DAY);
  const hours = Math.floor((total % MINUTES_PER_DAY) / 60);
  const mins = total % 60;
  const parts = [
    weeks > 0 ? `${weeks}w` : '',
    days > 0 ? `${days}d` : '',
    hours > 0 ? `${hours}h` : '',
    showMinutes && mins > 0 ? `${mins}m` : '',
  ].filter(Boolean);
  if (parts.length === 0) {
    return showMinutes ? '0m' : '0h';
  }
  return parts.join(' ');
}

/** "36h": a show's hours in the year, rounded; never "0h" for some time */
export function formatYearHours(minutes: number): string {
  if (minutes <= 0) {
    return '0h';
  }
  return `${Math.max(1, Math.round(minutes / 60))}h`;
}

/** Today's tile delta: whole percent; 100 when last year was 0 */
export function percentageDelta(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return Math.round(((current - previous) / previous) * 100);
}

/** One decimal, as the "Average per day" tile ("1.7") */
export function formatAverage(value: number): string {
  return (Math.round(value * 10) / 10).toLocaleString('en-US', {
    maximumFractionDigits: 1,
  });
}
