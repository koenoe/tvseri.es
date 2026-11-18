import { isRunning } from './status';

const yearOf = (date: string | null | undefined) =>
  date && /^\d{4}/.test(date) ? date.slice(0, 4) : '';

/**
 * A series' years, the one way every page writes them ("2014–" on
 * Home, "2014" on a landing card for the same running series): a running
 * series is open, "2014–"; an ended one is "2016–2025", or "2019" when it
 * began and ended in one year; '' when no year is known. A status that is not
 * running (`isRunning`) counts as ended. Dates are `YYYY-MM-DD` or ISO timestamps.
 */
export function formatSeriesYears(
  series: Readonly<{
    firstAirDate?: string | null;
    lastAirDate?: string | null;
    status?: string | null;
  }>,
): string {
  const first = yearOf(series.firstAirDate);
  const last = yearOf(series.lastAirDate);
  if (series.status && isRunning(series.status)) {
    return first ? `${first}–` : '';
  }
  if (!first) {
    return last;
  }
  return last && last !== first ? `${first}–${last}` : first;
}
