import { describe, expect, it } from 'vitest';

import { MAP_DOTS, projectToMap } from './worldMap';

describe('projectToMap', () => {
  // HMFinal's pins (left, top) for its five places
  it.each([
    ['Baltimore', 39.2904, -76.6122, 142.1, 84.9],
    ['Albuquerque', 35.0844, -106.6504, 59.2, 96.5],
    ['Medellín', 6.2476, -75.5658, 144.8, 176.4],
    ['Madrid', 40.4168, -3.7038, 343.6, 81.8],
    ['Pripyat', 51.3945, 30.0996, 437.0, 51.4],
  ])('puts %s where the board does', (_place, lat, lng, x, y) => {
    const point = projectToMap(lat, lng);
    expect(point?.x).toBeCloseTo(x, 0);
    expect(point?.y).toBeCloseTo(y, 0);
  });

  it('leaves out a place beyond the map', () => {
    expect(projectToMap(-41.29, 174.78)).toBeUndefined(); // Wellington
    expect(projectToMap(78.22, 15.65)).toBeUndefined(); // Svalbard
  });
});

describe('MAP_DOTS', () => {
  it('draws the board’s 2,541 dots', () => {
    const dots = [...MAP_DOTS.matchAll(/M\d+ \d+h(\d+)/g)].reduce(
      (sum, [, length]) => sum + Math.floor((Number(length) - 1) / 6) + 1,
      0,
    );
    expect(dots).toBe(2541);
  });
});
