import { describe, expect, it } from 'vitest';

import {
  CELL,
  decodeRuns,
  dotPaths,
  encodeRuns,
  ensureOwnDot,
  extractWindow,
  markOwn,
  pickZoom,
  WINDOWS,
  type WindowSpec,
  windowOrigin,
} from './grid';

const SMALL: WindowSpec = {
  anchor: { x: 12, y: 12 },
  cellsPerDegree: 2,
  cols: 3,
  height: 24,
  pitch: 8,
  rows: 3,
  width: 24,
};

describe('the designed windows', () => {
  it('desktop: 120 x 50 dots at a 12px pitch fill the 1440 x 600 map', () => {
    const { cols, height, pitch, rows, width } = WINDOWS.desktop;
    expect([cols * pitch, rows * pitch]).toEqual([width, height]);
  });

  it('phone: 8px dots inside the 390 x 420 map', () => {
    const { cols, height, pitch, rows, width } = WINDOWS.phone;
    // The design's last dot centres: x 388, y 412
    expect((cols - 1) * pitch + pitch / 2).toBe(388);
    expect((rows - 1) * pitch + pitch / 2).toBe(412);
    expect([width, height]).toEqual([390, 420]);
  });

  it('a whole number of columns spans the globe, so the grid wraps', () => {
    for (const spec of Object.values(WINDOWS)) {
      expect(Number.isInteger(spec.cellsPerDegree * 360)).toBe(true);
    }
  });
});

describe('windowOrigin', () => {
  it('puts the label point on the anchor, snapped to whole cells', () => {
    // anchor 12px at an 8px pitch = 1.5 cells in from the window's edge
    expect(windowOrigin({ col: 10.5, row: 20.5 }, SMALL)).toEqual({
      col: 9,
      row: 19,
    });
    expect(windowOrigin({ col: 10.9, row: 20.2 }, SMALL)).toEqual({
      col: 9,
      row: 19,
    });
    expect(windowOrigin({ col: 11.1, row: 21.1 }, SMALL)).toEqual({
      col: 10,
      row: 20,
    });
  });
});

describe('pickZoom', () => {
  const LIMITS = { maxDots: 600, maxZoom: 32, minDots: 40, minZoom: 1 / 8 };

  it('keeps the world scale when the country has enough dots', () => {
    expect(pickZoom(() => 40, LIMITS)).toBe(1);
  });

  it('doubles the zoom until the country has enough dots', () => {
    const dots: Record<number, number> = { 1: 3, 2: 12, 4: 45, 8: 180 };
    expect(pickZoom((zoom) => dots[zoom] ?? 0, LIMITS)).toBe(4);
  });

  it('stops at the largest zoom for the tiniest countries', () => {
    expect(pickZoom(() => 0, { ...LIMITS, maxZoom: 16 })).toBe(16);
  });

  it('halves the zoom until a big country no longer fills the window', () => {
    // a country bigger than the window fills it at every zoom it overflows
    const dots: Record<number, number> = { 0.5: 1500, 0.25: 400, 1: 2380 };
    expect(pickZoom((zoom) => dots[zoom] ?? 0, LIMITS)).toBe(0.25);
  });

  it('stops at the smallest zoom for a country that fills any window', () => {
    expect(pickZoom(() => 2548, LIMITS)).toBe(1 / 8);
  });
});

describe('runs', () => {
  it('round-trips a grid, including runs longer than 127 cells', () => {
    const cells = new Uint8Array(400);
    cells.fill(3, 10, 300);
    cells[301] = 200;
    cells.fill(1, 350);
    expect(decodeRuns(encodeRuns(cells), cells.length)).toEqual(cells);
  });

  it('stores a long run in a few bytes', () => {
    expect(encodeRuns(new Uint8Array(765)).length).toBeLessThanOrEqual(3);
  });

  it('rejects data that does not fill the grid exactly', () => {
    const bytes = encodeRuns(new Uint8Array(10));
    expect(() => decodeRuns(bytes, 11)).toThrow();
    expect(() => decodeRuns(bytes, 9)).toThrow();
  });
});

describe('extractWindow', () => {
  // A 4 x 3 globe: row-major cell values 1..12
  const grid = Uint8Array.from({ length: 12 }, (_, i) => i + 1);

  it('copies the window, wrapping round the antimeridian', () => {
    const window = extractWindow(
      grid,
      { cols: 4, rows: 3 },
      { col: 3, row: 0 },
      { cols: 3, rows: 2 },
    );
    expect([...window]).toEqual([4, 1, 2, 8, 5, 6]);
  });

  it('wraps a negative origin too', () => {
    const window = extractWindow(
      grid,
      { cols: 4, rows: 3 },
      { col: -1, row: 1 },
      { cols: 2, rows: 1 },
    );
    expect([...window]).toEqual([8, 5]);
  });

  it('is sea above and below the grid', () => {
    const window = extractWindow(
      grid,
      { cols: 4, rows: 3 },
      { col: 0, row: 2 },
      { cols: 2, rows: 3 },
    );
    expect([...window]).toEqual([9, 10, 0, 0, 0, 0]);
  });
});

describe('markOwn', () => {
  it('splits land into this country and the rest', () => {
    expect([...markOwn(Uint8Array.from([0, 1, 7, 9, 7]), 7)]).toEqual([
      CELL.sea,
      CELL.rest,
      CELL.own,
      CELL.rest,
      CELL.own,
    ]);
  });
});

describe('ensureOwnDot', () => {
  it('lights the anchor cell when the country has no dot at all', () => {
    const cells = new Uint8Array(9);
    ensureOwnDot(cells, SMALL);
    expect(cells[4]).toBe(CELL.own);
  });

  it('leaves a country that has dots alone', () => {
    const cells = new Uint8Array(9);
    cells[0] = CELL.own;
    ensureOwnDot(cells, SMALL);
    expect([...cells]).toEqual([CELL.own, 0, 0, 0, 0, 0, 0, 0, 0]);
  });
});

describe('dotPaths', () => {
  it('draws each dot as a zero-length segment at its cell centre', () => {
    const cells = Uint8Array.from([
      CELL.own,
      CELL.rest,
      CELL.own,
      CELL.sea,
      CELL.own,
      CELL.sea,
      CELL.rest,
      CELL.sea,
      CELL.sea,
    ]);
    expect(dotPaths(cells, SMALL)).toEqual({
      own: 'M4 4h0m16 0h0m-8 8h0',
      rest: 'M12 4h0m-8 16h0',
    });
  });

  it('gives empty paths for an empty window', () => {
    expect(dotPaths(new Uint8Array(9), SMALL)).toEqual({ own: '', rest: '' });
  });
});
