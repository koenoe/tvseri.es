import type { MultiPolygon, Polygon } from 'geojson';
import { describe, expect, it } from 'vitest';

import { prepareShapes, rasterise, toCell, worldGrid } from './rasterise';

/** A lon/lat box as GeoJSON (RFC 7946) writes it: exterior counter-clockwise */
const box = (west: number, south: number, east: number, north: number) => [
  [west, south],
  [east, south],
  [east, north],
  [west, north],
  [west, south],
];

const polygon = (...rings: Array<Array<Array<number>>>): Polygon => ({
  coordinates: rings,
  type: 'Polygon',
});

const filled = (cells: Uint8Array, cols: number, value: number) =>
  [...cells].flatMap((cell, index) =>
    cell === value ? [[index % cols, Math.floor(index / cols)]] : [],
  );

describe('worldGrid', () => {
  it('spans the globe in whole columns at the given scale', () => {
    expect(worldGrid(2).cols).toBe(720);
    expect(worldGrid(2.125).cols).toBe(765);
  });

  it('is Mercator: the equator splits the rows, latitudes stretch', () => {
    const grid = worldGrid(2);
    expect(toCell(grid, [0, 0])).toEqual({ col: 360, row: grid.rows / 2 });
    expect(toCell(grid, [-180, 0]).col).toBeCloseTo(0);
    const mercator60 =
      (Math.log(Math.tan(Math.PI / 4 + Math.PI / 6)) * 180) / Math.PI;
    expect(toCell(grid, [10, 60]).row).toBeCloseTo(
      grid.rows / 2 - mercator60 * 2,
    );
    expect(toCell(grid, [10, 60]).col).toBeCloseTo(380);
  });

  it('stops at 85° north and south', () => {
    const grid = worldGrid(2);
    expect(toCell(grid, [0, 85]).row).toBeGreaterThan(0);
    expect(toCell(grid, [0, 85]).row).toBeLessThan(1);
  });
});

describe('rasterise', () => {
  const grid = worldGrid(1);
  // 1 dot per degree; the window's top-left cell sits at 0°E, ~1°N
  const origin = { col: 180, row: grid.rows / 2 - 1 };
  const size = { cols: 6, rows: 6 };

  it('marks the cells whose centre is inside a polygon', () => {
    const shapes = prepareShapes([
      { geometry: polygon(box(1, -3, 4, 0)), value: 5 },
    ]);
    const cells = rasterise(shapes, grid, origin, size);
    // columns 1-3 (centres 1.5°-3.5°E), rows below the equator to ~3°S
    expect(filled(cells, size.cols, 5)).toEqual([
      [1, 1],
      [2, 1],
      [3, 1],
      [1, 2],
      [2, 2],
      [3, 2],
      [1, 3],
      [2, 3],
      [3, 3],
    ]);
    expect(filled(cells, size.cols, 0)).toHaveLength(36 - 9);
  });

  it('leaves holes empty', () => {
    const shapes = prepareShapes([
      { geometry: polygon(box(0, -5, 5, 0), box(2, -3, 3, -2)), value: 4 },
    ]);
    const cells = rasterise(shapes, grid, origin, size);
    expect(cells[3 * size.cols + 2]).toBe(0);
    expect(cells[2 * size.cols + 2]).toBe(4);
  });

  it('fills every part of a multipolygon', () => {
    const geometry: MultiPolygon = {
      coordinates: [[box(0, -1, 1, 0)], [box(4, -5, 5, -4)]],
      type: 'MultiPolygon',
    };
    const cells = rasterise(
      prepareShapes([{ geometry, value: 9 }]),
      grid,
      origin,
      size,
    );
    expect(filled(cells, size.cols, 9)).toEqual([
      [0, 1],
      [4, 5],
    ]);
  });

  it('accepts either ring winding', () => {
    const clockwise = box(1, -3, 4, 0).reverse();
    const a = rasterise(
      prepareShapes([{ geometry: polygon(clockwise), value: 2 }]),
      grid,
      origin,
      size,
    );
    const b = rasterise(
      prepareShapes([{ geometry: polygon(box(1, -3, 4, 0)), value: 2 }]),
      grid,
      origin,
      size,
    );
    expect(a).toEqual(b);
  });

  it('gives a cell to the first shape that holds it', () => {
    const shapes = prepareShapes([
      { geometry: polygon(box(0, -2, 2, 0)), value: 3 },
      { geometry: polygon(box(0, -6, 6, 0)), value: 7 },
    ]);
    const cells = rasterise(shapes, grid, origin, size);
    expect(cells[1 * size.cols + 0]).toBe(3);
    expect(cells[4 * size.cols + 4]).toBe(7);
  });

  it('wraps across the antimeridian', () => {
    const shapes = prepareShapes([
      { geometry: polygon(box(-180, -2, -178, 0)), value: 6 },
    ]);
    // window starting at 178°E: its columns 2-3 are 180°W-178°W
    const cells = rasterise(shapes, grid, { col: 358, row: origin.row }, size);
    expect(filled(cells, size.cols, 6)).toEqual([
      [2, 1],
      [3, 1],
      [2, 2],
      [3, 2],
    ]);
  });
});
