import { pad2 } from '@/lib/format/pad2';

const MINUTE = 60_000;

/**
 * Checks the day once a minute (for `useSyncExternalStore`), so a page left
 * open past midnight moves on.
 */
export const subscribeToMinute = (onChange: () => void) => {
  const timer = window.setInterval(onChange, MINUTE);
  return () => window.clearInterval(timer);
};

/** UTC midnight today in ms: the same number all day, for every viewer */
export function startOfUtcDay(): number {
  const today = new Date();
  return Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
}

/** The local calendar day of a moment (default: now) as `YYYY-MM-DD` */
export function localDay(at: number | Date = Date.now()): string {
  const date = new Date(at);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}
