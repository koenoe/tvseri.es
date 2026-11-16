/** TMDB statuses of a series that is still being made: its range stays open */
const RUNNING = new Set([
  'Returning Series',
  'In Production',
  'Planned',
  'Pilot',
]);

const yearOf = (date: string | null | undefined) =>
  date && /^\d{4}/.test(date) ? date.slice(0, 4) : '';

/**
 * A series' years, the one way every page writes them ("2014–" on
 * Home, "2014" on a landing card for the same running series): a running
 * series is open, "2014–"; an ended one is "2016–2025", or "2019" when it
 * began and ended in one year; '' when no year is known. An unknown status
 * counts as ended. Dates are `YYYY-MM-DD` or ISO timestamps.
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
  if (series.status && RUNNING.has(series.status)) {
    return first ? `${first}–` : '';
  }
  if (!first) {
    return last;
  }
  return last && last !== first ? `${first}–${last}` : first;
}
