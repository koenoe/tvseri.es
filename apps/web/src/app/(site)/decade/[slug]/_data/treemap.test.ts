import { describe, expect, it } from 'vitest';

import { layoutTreemap, MAP_HEIGHT, MAP_WIDTH, voteBars } from './treemap';

// The design's eleven shows (TMDB votes) and the tiles it draws
const VOTES = [
  24_000, 19_000, 18_000, 11_000, 10_100, 9400, 7000, 6100, 5500, 5400, 4600,
];
const BOARD: ReadonlyArray<readonly [number, number, number, number]> = [
  [4, 4, 427, 305], // Game of Thrones
  [4, 317, 427, 239], // Money Heist
  [439, 4, 286, 340], // Stranger Things
  [439, 352, 286, 204], // The Boys
  [733, 4, 244, 219], // Peaky Blinders
  [985, 4, 227, 219], // Sherlock
  [733, 231, 215, 170], // Dark
  [733, 409, 215, 147], // Chernobyl
  [956, 231, 125, 226], // Better Call Saul
  [1089, 231, 123, 226], // Black Mirror
  [956, 465, 256, 91], // Narcos
];

/** a cell back to its tile in pixels at the design's size */
const tile = (cell: ReturnType<typeof layoutTreemap>[number]) => [
  Math.round((cell.left / 100) * MAP_WIDTH) + 4,
  Math.round((cell.top / 100) * MAP_HEIGHT) + 4,
  Math.round((cell.width / 100) * MAP_WIDTH) - 8,
  Math.round((cell.height / 100) * MAP_HEIGHT) - 8,
];

describe('layoutTreemap', () => {
  it('draws the design’s tiles for the design’s votes', () => {
    expect(layoutTreemap(VOTES).map(tile)).toEqual(BOARD);
  });

  it('is deterministic and keeps the input order', () => {
    const cells = layoutTreemap(VOTES);
    expect(layoutTreemap(VOTES)).toEqual(cells);
    expect(cells).toHaveLength(VOTES.length);
    expect(cells[0]?.tileWidth).toBe(427);
  });

  it('adds the votes line to tiles of 220 × 150 or more (their cell)', () => {
    expect(layoutTreemap(VOTES).map((cell) => cell.votesLine)).toEqual([
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      false,
      false,
      false,
    ]);
  });

  it('fills the map: the cells tile it edge to edge', () => {
    const cells = layoutTreemap(VOTES);
    const area = cells.reduce((sum, cell) => sum + cell.width * cell.height, 0);
    expect(area / 10_000).toBeCloseTo(1, 2);
  });

  it('handles one show, none, and shows without votes', () => {
    expect(layoutTreemap([])).toEqual([]);
    expect(layoutTreemap([500])).toEqual([
      {
        height: 100,
        left: 0,
        tileWidth: MAP_WIDTH - 8,
        top: 0,
        votesLine: true,
        width: 100,
      },
    ]);
    expect(layoutTreemap([0, 0])).toHaveLength(2);
  });
});

describe('voteBars', () => {
  it('is each show’s votes as a share of the most-voted', () => {
    expect(voteBars(VOTES.slice(0, 8))).toEqual([
      100, 79, 75, 46, 42, 39, 29, 25,
    ]);
  });

  it('is empty bars when nobody voted', () => {
    expect(voteBars([0, 0])).toEqual([0, 0]);
    expect(voteBars([])).toEqual([]);
  });
});
