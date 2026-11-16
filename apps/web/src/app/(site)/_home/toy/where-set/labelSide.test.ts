import { describe, expect, it } from 'vitest';

import { labelSides, MAP_PX } from './labelSide';

const W = 680;
const H = 293;

describe('labelSides', () => {
  it('keeps the board side (right, above) when it is free', () => {
    expect(
      labelSides(
        [{ name: 'Baltimore', point: { x: 200, y: 120 } }],
        W,
        H,
        MAP_PX.phone,
      ),
    ).toEqual(['right-up']);
  });

  it('flips left at the map’s right edge so the label stays on the map', () => {
    expect(
      labelSides(
        [{ name: 'Pripyat', point: { x: 660, y: 120 } }],
        W,
        H,
        MAP_PX.phone,
      ),
    ).toEqual(['left-up']);
  });

  it('goes below at the top edge', () => {
    expect(
      labelSides(
        [{ name: 'Oslo', point: { x: 200, y: 10 } }],
        W,
        H,
        MAP_PX.phone,
      ),
    ).toEqual(['right-down']);
  });

  it('moves off a neighbouring pin to the free side', () => {
    // a pin just right of and above Madrid: the preferred side covers it
    const sides = labelSides(
      [
        { name: 'Madrid', point: { x: 330, y: 100 } },
        { name: 'Paris', point: { x: 380, y: 80 } },
      ],
      W,
      H,
      MAP_PX.phone,
    );
    expect(sides[0]).toBe('left-up');
  });

  it('decides each map width on its own: free on the wider map, flipped on the phone', () => {
    const places = [
      { name: 'Madrid', point: { x: 330, y: 100 } },
      { name: 'Pripyat', point: { x: 437, y: 51 } },
    ];
    expect(labelSides(places, W, H, MAP_PX.phone)[0]).toBe('left-up');
    expect(labelSides(places, W, H, MAP_PX.wide)[0]).toBe('right-up');
  });

  it('picks the side covering the fewest pins when none is free', () => {
    const crowd = [
      { name: 'Centre', point: { x: 340, y: 140 } },
      { name: 'A', point: { x: 380, y: 125 } },
      { name: 'B', point: { x: 300, y: 125 } },
      { name: 'C', point: { x: 380, y: 155 } },
      { name: 'D', point: { x: 300, y: 155 } },
      { name: 'E', point: { x: 420, y: 130 } },
    ];
    // right-up covers A and E, each other corner one pin: the first of
    // those in order wins
    expect(labelSides(crowd, W, H, MAP_PX.phone)[0]).toBe('left-up');
  });
});
