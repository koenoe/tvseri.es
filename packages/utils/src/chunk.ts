/** `items` in order, in groups of `size` (the last one may be shorter) */
export function chunk<T>(items: ReadonlyArray<T>, size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}
