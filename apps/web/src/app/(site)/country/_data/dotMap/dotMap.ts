import 'server-only';

import { brotliDecompressSync } from 'node:zlib';

import { DOT_MAP_DATASET } from './dataset';
import {
  type DotMapVariant,
  decodeRuns,
  dotPaths,
  extractWindow,
  FIRST_COUNTRY,
  markOwn,
  WINDOWS,
} from './grid';

const unpack = (base64: string) =>
  new Uint8Array(brotliDecompressSync(Buffer.from(base64, 'base64')));

/** Each world grid is decoded once per server process, on first use */
const worlds = new Map<DotMapVariant, Uint8Array>();

const world = (variant: DotMapVariant) => {
  let grid = worlds.get(variant);
  if (!grid) {
    const { grid: packed, rows } = DOT_MAP_DATASET[variant];
    const cols = Math.round(WINDOWS[variant].cellsPerDegree * 360);
    grid = decodeRuns(unpack(packed), cols * rows);
    worlds.set(variant, grid);
  }
  return grid;
};

const VALUE = new Map(
  DOT_MAP_DATASET.codes.map((code, index) => [code, FIRST_COUNTRY + index]),
);

/**
 * The two SVG paths (this country's dots, everyone else's) of a country's
 * window, or undefined when Natural Earth has no shape for the code.
 */
export const dotMapPaths = (code: string, variant: DotMapVariant) => {
  const iso = code.toUpperCase();
  const value = VALUE.get(iso);
  const window = DOT_MAP_DATASET[variant].windows[iso];
  if (value === undefined || window === undefined) {
    return undefined;
  }
  const spec = WINDOWS[variant];
  const cells =
    typeof window === 'string'
      ? decodeRuns(unpack(window), spec.cols * spec.rows)
      : markOwn(
          extractWindow(
            world(variant),
            {
              cols: Math.round(spec.cellsPerDegree * 360),
              rows: DOT_MAP_DATASET[variant].rows,
            },
            { col: window[0], row: window[1] },
            spec,
          ),
          value,
        );
  return dotPaths(cells, spec);
};
