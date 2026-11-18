/**
 * The country dot map's grid: the window sizes, the run-length codec of the generated dataset, and turning a window of
 * cells into the two SVG paths of round-capped dots.
 *
 * Pure and import-free: `scripts/generate-dot-maps.mjs` (plain Node) uses it too.
 */

/** A window's cell values: no dot, a dot of another country, a dot of this one */
export const CELL = { own: 2, rest: 1, sea: 0 } as const;

/** Global grid values: 0 sea, 1 land of no ISO country, then `FIRST_COUNTRY + i` */
export const OTHER_LAND = 1;
export const FIRST_COUNTRY = 2;

export type DotMapVariant = 'desktop' | 'phone';

export type WindowSpec = Readonly<{
  /** Where the country's label point lands, in px from the map's top left */
  anchor: Readonly<{ x: number; y: number }>;
  /** Mercator scale of the world grid: dots per degree of longitude */
  cellsPerDegree: number;
  cols: number;
  height: number;
  pitch: number;
  rows: number;
  width: number;
}>;

/**
 * Measured on reference maps (GB, KR, DK desktop; GB phone) by fitting
 * Natural Earth to their dots.
 */
export const WINDOWS: Readonly<Record<DotMapVariant, WindowSpec>> = {
  desktop: {
    anchor: { x: 1114, y: 300 },
    cellsPerDegree: 2.125,
    cols: 120,
    height: 600,
    pitch: 12,
    rows: 50,
    width: 1440,
  },
  phone: {
    anchor: { x: 256, y: 208 },
    cellsPerDegree: 2,
    cols: 49,
    height: 420,
    pitch: 8,
    rows: 52,
    width: 390,
  },
};

/** The generated dataset (scripts/generate-dot-maps.mjs) */
export type DotMapDataset = Readonly<{
  /** ISO 3166-1 alpha-2; code i has grid value FIRST_COUNTRY + i */
  codes: ReadonlyArray<string>;
  desktop: VariantData;
  phone: VariantData;
}>;

type VariantData = Readonly<{
  /** Base64 brotli of the world grid's runs (`encodeRuns`), row-major */
  grid: string;
  rows: number;
  /**
   * Per code: the window's top-left cell in the world grid, or (zoomed in for a
   * tiny country, out for a big one) base64 brotli of the window's own runs of
   * CELL values
   */
  windows: Readonly<Record<string, readonly [number, number] | string>>;
}>;

/**
 * Below `minDots` dots the window zooms in (doubling, up to `maxZoom`); a
 * country with more than `maxShare` of the window's cells zooms out (halving,
 * down to `minZoom`). At world scale a big country (the US, Russia, Canada)
 * fills the whole window, which the radial fade turns into a plain disc with
 * no outline; zoomed out, the country keeps its shape with sea around it.
 */
export const ZOOM = {
  maxShare: 0.25,
  maxZoom: 32,
  minDots: 40,
  minZoom: 1 / 8,
} as const;

type Cell = Readonly<{ col: number; row: number }>;
type Size = Readonly<{ cols: number; rows: number }>;

/**
 * The window's top-left cell in the world grid, so the label point (in grid
 * cells, fractional) lands on the anchor.
 */
export const windowOrigin = (label: Cell, spec: WindowSpec): Cell => ({
  col: Math.round(label.col - spec.anchor.x / spec.pitch),
  row: Math.round(label.row - spec.anchor.y / spec.pitch),
});

/**
 * The world scale (1) unless the country is too small or too big for it: the
 * first zoom in (2, 4...) at which it has `minDots` dots, or the first zoom
 * out (1/2, 1/4...) at which it has no more than `maxDots`.
 */
export const pickZoom = (
  dotsAt: (zoom: number) => number,
  {
    maxDots,
    maxZoom,
    minDots,
    minZoom,
  }: Readonly<{
    maxDots: number;
    maxZoom: number;
    minDots: number;
    minZoom: number;
  }>,
) => {
  let zoom = 1;
  while (zoom < maxZoom && dotsAt(zoom) < minDots) {
    zoom *= 2;
  }
  if (zoom > 1) {
    return zoom;
  }
  while (zoom > minZoom && dotsAt(zoom) > maxDots) {
    zoom /= 2;
  }
  return zoom;
};

/** Run-length bytes: per run its value, then its length as a LEB128 varint */
export const encodeRuns = (cells: Uint8Array) => {
  const bytes: Array<number> = [];
  let start = 0;
  while (start < cells.length) {
    const value = cells[start] ?? 0;
    let end = start + 1;
    while (end < cells.length && cells[end] === value) {
      end += 1;
    }
    bytes.push(value);
    let length = end - start;
    while (length > 127) {
      bytes.push((length & 127) | 128);
      length >>>= 7;
    }
    bytes.push(length);
    start = end;
  }
  return Uint8Array.from(bytes);
};

export const decodeRuns = (bytes: Uint8Array, size: number) => {
  const cells = new Uint8Array(size);
  let at = 0;
  let index = 0;
  while (index < bytes.length) {
    const value = bytes[index++] ?? 0;
    let length = 0;
    let shift = 0;
    let byte = 128;
    while (byte & 128) {
      byte = bytes[index++] ?? 0;
      length |= (byte & 127) << shift;
      shift += 7;
    }
    if (at + length > size) {
      throw new Error('Dot map runs overflow the grid');
    }
    cells.fill(value, at, at + length);
    at += length;
  }
  if (at !== size) {
    throw new Error('Dot map runs do not fill the grid');
  }
  return cells;
};

/** Copies a window out of the world grid; columns wrap, rows outside are sea */
export const extractWindow = (
  grid: Uint8Array,
  gridSize: Size,
  origin: Cell,
  size: Size,
) => {
  const window = new Uint8Array(size.cols * size.rows);
  for (let row = 0; row < size.rows; row++) {
    const gridRow = origin.row + row;
    if (gridRow < 0 || gridRow >= gridSize.rows) {
      continue;
    }
    for (let col = 0; col < size.cols; col++) {
      const gridCol =
        (((origin.col + col) % gridSize.cols) + gridSize.cols) % gridSize.cols;
      window[row * size.cols + col] =
        grid[gridRow * gridSize.cols + gridCol] ?? 0;
    }
  }
  return window;
};

/** World grid values to window cells for the country with grid value `own` */
export const markOwn = (window: Uint8Array, own: number) =>
  window.map((value) =>
    value === own ? CELL.own : value === CELL.sea ? CELL.sea : CELL.rest,
  );

/** A country too small for any cell centre still gets one dot, at its anchor */
export const ensureOwnDot = (cells: Uint8Array, spec: WindowSpec) => {
  if (cells.includes(CELL.own)) {
    return;
  }
  const col = Math.floor(spec.anchor.x / spec.pitch);
  const row = Math.floor(spec.anchor.y / spec.pitch);
  cells[row * spec.cols + col] = CELL.own;
};

/**
 * One path per kind: a zero-length segment per dot (drawn round by the stroke's
 * round caps), the first move absolute and the rest relative to keep it short.
 */
export const dotPaths = (cells: Uint8Array, spec: WindowSpec) => {
  const path = (kind: number) => {
    const parts: Array<string> = [];
    let x = 0;
    let y = 0;
    cells.forEach((value, index) => {
      if (value !== kind) {
        return;
      }
      const nextX = (index % spec.cols) * spec.pitch + spec.pitch / 2;
      const nextY = Math.floor(index / spec.cols) * spec.pitch + spec.pitch / 2;
      parts.push(
        parts.length === 0
          ? `M${nextX} ${nextY}h0`
          : `m${nextX - x} ${nextY - y}h0`,
      );
      x = nextX;
      y = nextY;
    });
    return parts.join('');
  };
  return { own: path(CELL.own), rest: path(CELL.rest) };
};
