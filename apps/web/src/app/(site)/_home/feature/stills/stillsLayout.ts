/**
 * How the episode stills are laid out, per count (the API sends 6 to 12:
 * every qualifying episode of a short season, the twelve best of a long
 * one). Rows of equal-width tiles, so there is never a hole; a longer row
 * goes last.
 *
 * From lg the stills sit beside the season picture:
 * two rows up to eight (3 + 3, 3 + 4, 4 + 4), three from nine (3 + 3 + 3 …
 * 4 + 4 + 4), sharing the picture's 320px, so the tiles grow to fill the
 * column and its bottom edge is level with the picture's.
 *
 * Below lg they sit under the picture as 16:9 tiles, at most three across
 * (on a phone: 3 + 3 for six, 3 + 3 + 3 + 3 for twelve; 2 + 2 + 3
 * for seven).
 */
export const STILLS_MIN = 6;
export const STILLS_MAX = 12;

/** The most common count: the placeholder's when the day's isn't known */
export const STILLS_TYPICAL = 8;

/** The most stills in a row under the picture */
const STACKED_ROW_MAX = 3;

const tilesOf = (count: number) =>
  Math.min(Math.max(Math.round(count), 1), STILLS_MAX);

/** `tiles` cut into `rows` rows that differ by one at most, the longer last */
const balanced = (tiles: number, rows: number): ReadonlyArray<number> => {
  const base = Math.floor(tiles / rows);
  const longer = tiles % rows;
  return Array.from({ length: rows }, (_, row) =>
    row >= rows - longer ? base + 1 : base,
  );
};

/** The rows beside the season picture (from lg) */
export function stillsRows(count: number): ReadonlyArray<number> {
  const tiles = tilesOf(count);
  return balanced(tiles, tiles < STILLS_MIN ? 1 : tiles <= 8 ? 2 : 3);
}

/** The rows under the season picture (below lg) */
export function stackedStillsRows(count: number): ReadonlyArray<number> {
  const tiles = tilesOf(count);
  return balanced(tiles, Math.ceil(tiles / STACKED_ROW_MAX));
}

/** One layout as a CSS grid: its column count and each still's span */
type StillsGridLayout = Readonly<{
  columns: number;
  spans: ReadonlyArray<number>;
}>;

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

/**
 * Rows of different lengths in one grid: the columns are a multiple of
 * every row's length, and each still spans its row's share, so one list of
 * links takes both layouts (the stills are never drawn twice).
 */
const asGrid = (rows: ReadonlyArray<number>): StillsGridLayout => {
  const columns = rows.reduce(
    (lcm, length) => (lcm * length) / gcd(lcm, length),
    1,
  );
  return {
    columns,
    spans: rows.flatMap((length) =>
      Array.from({ length }, () => columns / length),
    ),
  };
};

export function stillsGrid(count: number): Readonly<{
  side: StillsGridLayout;
  stacked: StillsGridLayout;
}> {
  return {
    side: asGrid(stillsRows(count)),
    stacked: asGrid(stackedStillsRows(count)),
  };
}
