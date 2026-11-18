import { db } from './db';

/**
 * The Cache table's stored values, without the single-flight claims
 * (`CACHE#claim:...`, see lib/db/cache/singleFlight.ts) that day builds and
 * breakers leave behind
 */
export const storedRows = () =>
  db
    .dump('Cache')
    .filter((item) => !String(item.pk).startsWith('CACHE#claim:'));

/**
 * Hours until a day build (readThroughDay) is no longer fresh: its stored
 * `freshUntil`, not the row's DynamoDB TTL (kept two days longer for the next
 * day's fallback)
 */
export const freshHoursLeft = (pkPart: string) => {
  const row = storedRows().find((item) => String(item.pk).includes(pkPart));
  const { freshUntil } = JSON.parse(String(row?.value ?? '{}')) as {
    freshUntil?: number;
  };
  return (Number(freshUntil) - Date.now()) / 3_600_000;
};
