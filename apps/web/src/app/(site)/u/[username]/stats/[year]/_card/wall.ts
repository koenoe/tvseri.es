/**
 * The share card's poster wall: a grid of 2:3
 * cells where each poster covers a square block of cells, so every poster
 * stays 2:3. Sizes go by rank in hours: #1 is 3 × 3 cells, #2 and #3 are
 * 2 × 2, the rest 1 × 1. Posters are placed big to small, each in the first
 * free block scanning row by row, which gives the story's
 * 8 × 3 (top 10) and the square's 5 × 4 (top 6). With fewer shows the wall
 * just ends early (cells drop from the end). Pure: satori has no grid, so the
 * card draws these as absolutely positioned images.
 */

export type WallGrid = Readonly<{
  cols: number;
  rows: number;
  /** Top-left corner and width of the wall on the card, in px */
  left: number;
  top: number;
  width: number;
  gap: number;
}>;

export type WallCell = Readonly<{
  /** 0 is the show with the most hours */
  rank: number;
  /** Cells per side: 3, 2 or 1 */
  span: number;
  left: number;
  top: number;
  width: number;
  height: number;
  /** The corner per size: 18, 14, 10 */
  radius: number;
}>;

const RADIUS: Readonly<Record<number, number>> = { 1: 10, 2: 14, 3: 18 };

/** Half to even, as Python's `round` does: 772.5 → 772 */
const round = (value: number) => {
  const floor = Math.floor(value);
  const fraction = value - floor;
  if (Math.abs(fraction - 0.5) > 1e-9) {
    return Math.round(value);
  }
  return floor % 2 === 0 ? floor : floor + 1;
};

/** The size of the poster at `rank`, in cells per side */
export const spanOf = (rank: number) => (rank === 0 ? 3 : rank <= 2 ? 2 : 1);

/** How many posters fit the grid (every cell used) */
export function wallCapacity({ cols, rows }: WallGrid): number {
  let free = cols * rows;
  let rank = 0;
  while (free >= spanOf(rank) ** 2) {
    free -= spanOf(rank) ** 2;
    rank += 1;
  }
  return rank;
}

/** Where the posters of the first `count` ranks go (px, rounded to the pixel) */
export function wallLayout(grid: WallGrid, count: number): WallCell[] {
  const { cols, rows, gap } = grid;
  const cellWidth = (grid.width - (cols - 1) * gap) / cols;
  const cellHeight = cellWidth * 1.5;
  const taken = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => false),
  );
  const fits = (row: number, col: number, span: number) => {
    if (row + span > rows || col + span > cols) {
      return false;
    }
    for (let r = row; r < row + span; r += 1) {
      for (let c = col; c < col + span; c += 1) {
        if (taken[r]?.[c]) {
          return false;
        }
      }
    }
    return true;
  };
  const place = (span: number) => {
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        if (fits(row, col, span)) {
          for (let r = row; r < row + span; r += 1) {
            for (let c = col; c < col + span; c += 1) {
              taken[r]![c] = true;
            }
          }
          return { col, row };
        }
      }
    }
    return null;
  };
  const cells: WallCell[] = [];
  for (let rank = 0; rank < count; rank += 1) {
    const span = spanOf(rank);
    const spot = place(span);
    if (!spot) {
      break;
    }
    cells.push({
      height: round(span * cellHeight + (span - 1) * gap),
      left: round(grid.left + spot.col * (cellWidth + gap)),
      radius: RADIUS[span] ?? 10,
      rank,
      span,
      top: round(grid.top + spot.row * (cellHeight + gap)),
      width: round(span * cellWidth + (span - 1) * gap),
    });
  }
  return cells;
}
