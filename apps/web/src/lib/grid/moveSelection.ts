export type ArrowKey = 'ArrowDown' | 'ArrowLeft' | 'ArrowRight' | 'ArrowUp';

/** The keys that move in a grid: arrows, and Home / End (first, last). */
export type GridKey = ArrowKey | 'End' | 'Home';

const GRID_KEYS: ReadonlySet<string> = new Set<GridKey>([
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'End',
  'Home',
]);

export const isGridKey = (key: string): key is GridKey => GRID_KEYS.has(key);

/**
 * One block of a 2-D grid as the arrows see it: `size` cells wrapping at
 * `columns` (Infinity = one sideways strip). Shared by search (people row,
 * posters) and the Remote (one block per row of keys).
 */
export type GridBlock = Readonly<{ columns: number; size: number }>;

const startOf = (blocks: ReadonlyArray<GridBlock>, index: number) =>
  blocks.slice(0, index).reduce((sum, block) => sum + block.size, 0);

/**
 * The keyboard: ← → move one cell (across blocks); ↑ ↓ move a row,
 * crossing between blocks to the same column (clamped); Home and End go to
 * the first and the last cell. With nothing marked
 * (the recents before the first arrow), any arrow marks the first cell.
 * `wrap` (a menu): ↓ on the last cell goes to the first, ↑ on the first to
 * the last. Returns -1 when there is nothing to mark.
 */
export function moveSelection(
  blocks: ReadonlyArray<GridBlock>,
  selected: number,
  key: GridKey,
  { wrap = false }: Readonly<{ wrap?: boolean }> = {},
): number {
  const total = startOf(blocks, blocks.length);
  if (total === 0) {
    return -1;
  }
  if (selected < 0) {
    return 0;
  }
  if (key === 'Home') {
    return 0;
  }
  if (wrap && key === 'ArrowDown' && selected === total - 1) {
    return 0;
  }
  if (wrap && key === 'ArrowUp' && selected === 0) {
    return total - 1;
  }
  if (key === 'End') {
    return total - 1;
  }
  if (key === 'ArrowRight') {
    return Math.min(selected + 1, total - 1);
  }
  if (key === 'ArrowLeft') {
    return Math.max(selected - 1, 0);
  }

  let blockIndex = 0;
  let inBlock = selected;
  while (
    inBlock >= (blocks[blockIndex]?.size ?? 0) &&
    blockIndex < blocks.length - 1
  ) {
    inBlock -= blocks[blockIndex]?.size ?? 0;
    blockIndex += 1;
  }
  const block = blocks[blockIndex];
  if (!block) {
    return selected;
  }
  const column = Number.isFinite(block.columns)
    ? inBlock % block.columns
    : inBlock;

  if (key === 'ArrowDown') {
    if (inBlock + block.columns < block.size) {
      return selected + block.columns;
    }
    const next = blocks[blockIndex + 1];
    if (!next) {
      return selected;
    }
    return (
      startOf(blocks, blockIndex + 1) +
      Math.min(column, next.size - 1, next.columns - 1)
    );
  }

  if (inBlock - block.columns >= 0) {
    return selected - block.columns;
  }
  const previous = blocks[blockIndex - 1];
  if (!previous) {
    return selected;
  }
  const lastRowStart = Number.isFinite(previous.columns)
    ? Math.floor((previous.size - 1) / previous.columns) * previous.columns
    : 0;
  return (
    startOf(blocks, blockIndex - 1) +
    Math.min(lastRowStart + column, previous.size - 1)
  );
}
