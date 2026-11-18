/**
 * Each row's scroll offset per history entry, so Back returns a row to where
 * the user left it. Module scope: it survives client navigations and clears
 * on a full reload, like the history keys it pairs with.
 */
const offsets = new Map<string, number>();

const cacheKey = (restoreKey: string, historyKey: string) =>
  `${restoreKey}:${historyKey}`;

export function getRowOffset(
  restoreKey: string,
  historyKey: string,
): number | undefined {
  return offsets.get(cacheKey(restoreKey, historyKey));
}

export function setRowOffset(
  restoreKey: string,
  historyKey: string,
  offset: number,
): void {
  offsets.set(cacheKey(restoreKey, historyKey), offset);
}
