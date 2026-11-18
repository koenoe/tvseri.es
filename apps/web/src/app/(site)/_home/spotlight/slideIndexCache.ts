/**
 * The spotlight's slide per history entry, so Back returns to the slide the
 * visitor left. Module level: survives client
 * navigations, cleared by a full load.
 */
const cache = new Map<string, number>();

export const getSlideIndex = (historyKey: string): number | undefined =>
  cache.get(historyKey);

export function setSlideIndex(historyKey: string, index: number): void {
  cache.set(historyKey, index);
}
