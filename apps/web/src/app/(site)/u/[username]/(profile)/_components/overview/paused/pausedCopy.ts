import type { PausedItem } from '@tvseri.es/schemas';

import { formatWhen } from '@/lib/format/when';

/** "Last watched today", "… Wed", "… Fri 2 Aug", "… 7 Jan 2025": the one ladder */
export function lastWatchedLine(
  item: Pick<PausedItem, 'lastWatchedAt'>,
  now: number,
): string {
  return `Last watched ${formatWhen(item.lastWatchedAt, now, { capital: false })}`;
}

/** The rows that stay after some were answered */
export function withoutAnswered<T extends Readonly<{ seriesId: number }>>(
  rows: ReadonlyArray<T>,
  answered: ReadonlySet<number>,
): T[] {
  return rows.filter((row) => !answered.has(row.seriesId));
}
