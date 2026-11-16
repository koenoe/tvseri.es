/**
 * The hub's text formats, as the hub prints them: "7,240 series",
 * "1,104 miniseries", "5h 31m", "Updated Nov 10". English only, like the rest of the site.
 */

import { formatMonthDay } from '@/lib/format/calendarDay';
import { formatCappedCount } from '@/lib/formatCount';

const PLURAL: Readonly<Record<string, string>> = {
  episode: 'episodes',
  miniseries: 'miniseries',
  series: 'series',
};

export const formatCount = (count: number, noun: string): string =>
  `${formatCappedCount(count)} ${count === 1 ? noun : (PLURAL[noun] ?? `${noun}s`)}`;

export const formatEpisodes = (count: number): string =>
  formatCount(count, 'episode');

/** "Updated Nov 10" for `2026-11-10` */
export const updatedLine = (date: string): string =>
  `Updated ${formatMonthDay(`${date}T00:00:00Z`)}`;
