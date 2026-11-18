import type { WaitingForItem } from '@tvseri.es/schemas';

/** An undated return: the line stops a little way in, then fades */
const UNDATED = 12;

/**
 * How far along the wait is, 0 to 100: from finishing the show to its
 * return date, today's place on the line.
 */
export function waitProgress(item: WaitingForItem, now: number): number {
  if (item.state !== 'dated' || !item.nextDate || !item.finishedAt) {
    return UNDATED;
  }
  const end = Date.parse(item.nextDate);
  const total = end - item.finishedAt;
  if (total <= 0) {
    return 100;
  }
  return Math.min(100, Math.max(0, ((now - item.finishedAt) / total) * 100));
}
