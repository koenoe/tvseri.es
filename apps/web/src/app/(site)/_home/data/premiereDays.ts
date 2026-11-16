import type { Premiere } from '@tvseri.es/schemas';

import { daysBetween } from './day';

/**
 * Premieres as seen on `day`: `daysAway` from that day (the API's count is
 * from the day it built the list, which a cache can serve a day later), and
 * none that already aired.
 */
export function onDay(
  premieres: ReadonlyArray<Premiere>,
  day: string,
): Premiere[] {
  return premieres
    .map((premiere) => ({
      ...premiere,
      daysAway: daysBetween(day, premiere.date),
    }))
    .filter((premiere) => premiere.daysAway >= 0);
}
