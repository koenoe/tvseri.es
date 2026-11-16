/**
 * Natural Earth shapes to dot cells, for `scripts/generate-dot-maps.mjs` only
 * (never imported by the app). d3-geo does the Mercator projection and the
 * point-in-polygon test (holes, multipolygons, the antimeridian).
 */
import {
  type GeoProjection,
  geoArea,
  geoBounds,
  geoContains,
  geoMercator,
} from 'd3-geo';
import type { MultiPolygon, Polygon, Position } from 'geojson';

/** Mercator's usual limit; Antarctica's tip would stretch without end */
const MAX_LATITUDE = 85;

export type WorldGrid = Readonly<{
  cols: number;
  projection: GeoProjection;
  rows: number;
}>;

/** The world as a grid of cells, `cellsPerDegree` per degree of longitude */
export const worldGrid = (cellsPerDegree: number): WorldGrid => {
  const cols = Math.round(360 * cellsPerDegree);
  const scale = (cellsPerDegree * 180) / Math.PI;
  const halfRows = Math.ceil(
    scale * Math.log(Math.tan(Math.PI / 4 + (MAX_LATITUDE * Math.PI) / 360)),
  );
  return {
    cols,
    projection: geoMercator()
      .scale(scale)
      .translate([cols / 2, halfRows]),
    rows: 2 * halfRows,
  };
};

/** A lon/lat position in grid cells (fractional; cell c spans [c, c + 1)) */
export const toCell = (grid: WorldGrid, position: [number, number]) => {
  const [col, row] = grid.projection(position) ?? [Number.NaN, Number.NaN];
  return { col, row };
};

type Shape = Readonly<{ geometry: MultiPolygon | Polygon; value: number }>;

type PreparedShape = Readonly<{
  bounds: Readonly<{
    east: number;
    north: number;
    south: number;
    west: number;
  }>;
  polygon: Polygon;
  value: number;
}>;

/**
 * Splits shapes into polygons with their bounds, wound the way d3-geo reads
 * them (GeoJSON's counter-clockwise rings would mean "the whole globe but").
 */
export const prepareShapes = (shapes: ReadonlyArray<Shape>) =>
  shapes.flatMap(({ geometry, value }): Array<PreparedShape> => {
    const parts: Array<Array<Array<Position>>> =
      geometry.type === 'Polygon'
        ? [geometry.coordinates]
        : geometry.coordinates;
    return parts.map((rings) => {
      let polygon: Polygon = { coordinates: rings, type: 'Polygon' };
      if (geoArea(polygon) > 2 * Math.PI) {
        polygon = {
          coordinates: rings.map((ring) => [...ring].reverse()),
          type: 'Polygon',
        };
      }
      const [[west, south], [east, north]] = geoBounds(polygon);
      return { bounds: { east, north, south, west }, polygon, value };
    });
  });

const inBounds = (
  { east, north, south, west }: PreparedShape['bounds'],
  lon: number,
  lat: number,
) =>
  lat >= south &&
  lat <= north &&
  (west <= east ? lon >= west && lon <= east : lon >= west || lon <= east);

/**
 * The value of the first shape holding each cell's centre (0 for none), for a
 * window of `size` cells whose top-left cell is `origin`. Columns wrap.
 */
export const rasterise = (
  shapes: ReadonlyArray<PreparedShape>,
  grid: WorldGrid,
  origin: Readonly<{ col: number; row: number }>,
  size: Readonly<{ cols: number; rows: number }>,
) => {
  const invert = grid.projection.invert;
  if (!invert) {
    throw new Error('Mercator has an inverse');
  }
  const cells = new Uint8Array(size.cols * size.rows);
  for (let row = 0; row < size.rows; row++) {
    for (let col = 0; col < size.cols; col++) {
      const position = invert([origin.col + col + 0.5, origin.row + row + 0.5]);
      if (!position) {
        continue;
      }
      const lon = ((((position[0] + 180) % 360) + 360) % 360) - 180;
      const lat = position[1];
      const shape = shapes.find(
        ({ bounds, polygon }) =>
          inBounds(bounds, lon, lat) && geoContains(polygon, [lon, lat]),
      );
      cells[row * size.cols + col] = shape?.value ?? 0;
    }
  }
  return cells;
};
