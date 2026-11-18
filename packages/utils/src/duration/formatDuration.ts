/**
 * A time span in hours and minutes, the one way every page writes it (time
 * left, runtimes, totals): 58 → "58m", 120 → "2h", 190 → "3h 10m"; minutes
 * only when there are some (no "15h 0m"), no days. Rounded to
 * the minute, never negative.
 */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) {
    return `${rest}m`;
  }
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

/** A runtime ("58m", "1h 55m", "4h"); null when there is none */
export function formatRuntime(minutes: number | null | undefined) {
  return minutes && minutes > 0 ? formatDuration(minutes) : null;
}
