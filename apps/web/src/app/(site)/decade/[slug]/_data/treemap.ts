import { hierarchy, treemap, treemapSquarify } from 'd3-hierarchy';

/** The decade map: the page column at 1440 (1216) by 560, tiles 8 apart */
export const MAP_WIDTH = 1216;
export const MAP_HEIGHT = 560;
const GAP = 8;

/**
 * Tiles of 220 × 150 or more add the votes line; smaller ones
 * show the title only. Measured on the tile's cell (the tile and half the
 * gap on every side), so Dark (215 × 170) and Chernobyl (215 × 147) keep
 * their votes line.
 */
const VOTES_LINE_WIDTH = 220;
const VOTES_LINE_HEIGHT = 150;

export type TreemapCell = Readonly<{
  /** the cell's box, in percent of the map (the tile is inset 4px in it) */
  left: number;
  top: number;
  width: number;
  height: number;
  /** the tile's width at the map's full size, for the backdrop's `sizes` */
  tileWidth: number;
  /** a big enough tile adds the votes line under the title */
  votesLine: boolean;
}>;

type Node = Readonly<{ index?: number; value?: number; children?: Node[] }>;

const percent = (value: number, of: number) =>
  Math.round((value / of) * 100_000) / 1000;

/**
 * The decade's landscape: a squarified treemap (d3-hierarchy, ratio 1) of
 * `values` (TMDB vote counts, biggest first) at the map's full size, as
 * cells in percent so it scales with the column while the 8px gaps stay. Deterministic: the same values give the same layout.
 * One cell per value, in the given order.
 */
export function layoutTreemap(
  values: ReadonlyArray<number>,
): ReadonlyArray<TreemapCell> {
  if (values.length === 0) {
    return [];
  }
  const root = hierarchy<Node>({
    children: values.map((value, index) => ({
      index,
      // a show without votes still gets a sliver
      value: Math.max(1, value),
    })),
  }).sum((node) => node.value ?? 0);
  treemap<Node>()
    .tile(treemapSquarify.ratio(1))
    .size([MAP_WIDTH, MAP_HEIGHT])
    .paddingInner(GAP)
    .paddingOuter(GAP / 2)
    .round(true)(root);

  const cells: TreemapCell[] = [];
  for (const leaf of root.leaves()) {
    const { x0, x1, y0, y1 } = leaf as typeof leaf & {
      x0: number;
      x1: number;
      y0: number;
      y1: number;
    };
    const width = x1 - x0 + GAP;
    const height = y1 - y0 + GAP;
    cells[leaf.data.index ?? 0] = {
      height: percent(height, MAP_HEIGHT),
      left: percent(x0 - GAP / 2, MAP_WIDTH),
      tileWidth: x1 - x0,
      top: percent(y0 - GAP / 2, MAP_HEIGHT),
      votesLine: width >= VOTES_LINE_WIDTH && height >= VOTES_LINE_HEIGHT,
      width: percent(width, MAP_WIDTH),
    };
  }
  return cells;
}

/**
 * The phone's ranked list: each row's 4px bar as a whole
 * percentage of the most-voted show's votes.
 */
export function voteBars(votes: ReadonlyArray<number>): ReadonlyArray<number> {
  const most = Math.max(0, ...votes);
  return votes.map((value) =>
    most > 0 ? Math.round((Math.max(0, value) / most) * 100) : 0,
  );
}
