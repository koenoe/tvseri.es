/**
 * "Neighbours never repeat": two sections next to each other never
 * show the same show. The section that gives way drops the overlap and takes
 * the next shows in its own list. Personal sections give way to the cached
 * ones around them; between two cached sections the lower one does.
 * Continue watching is exempt (your own state, in your order).
 */
export function withoutNeighbours<T extends Readonly<{ id: number }>>(
  items: ReadonlyArray<T>,
  neighbours: ReadonlyArray<ReadonlyArray<number>>,
  limit = Number.POSITIVE_INFINITY,
): T[] {
  const taken = new Set(neighbours.flat());
  const result: T[] = [];
  for (const item of items) {
    if (result.length >= limit) {
      break;
    }
    if (!taken.has(item.id)) {
      taken.add(item.id);
      result.push(item);
    }
  }
  return result;
}

export const idsOf = (items: ReadonlyArray<Readonly<{ id: number }>>) =>
  items.map((item) => item.id);
