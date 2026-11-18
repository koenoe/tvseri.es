/**
 * The hub's "Updated Nov 10". Its counts are `pluralCapped` ("7,240 series",
 * "20,000+ series") from `@/lib/format/text`.
 */

import { formatMonthDay } from '@/lib/format/calendarDay';

/** "Updated Nov 10" for `2026-11-10` */
export const updatedLine = (date: string): string =>
  `Updated ${formatMonthDay(`${date}T00:00:00Z`)}`;
