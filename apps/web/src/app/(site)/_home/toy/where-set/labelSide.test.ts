import { describe, expect, it } from 'vitest';

import { labelSides, MAP_PX, roomyPins } from './labelSide';

const W = 680;
const H = 293;

describe('labelSides', () => {
  it('keeps the default side (right, above) when it is free', () => {
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

describe('roomyPins', () => {
  it('marks a pin roomy when every other pin is at least 44px away on that map', () => {
    // 280 / 680 scale: 107 units ≈ 44.06px, 106 ≈ 43.6px
    const points = [
      { x: 100, y: 100 },
      { x: 207, y: 100 },
      { x: 500, y: 200 },
    ];
    expect(roomyPins(points, W, MAP_PX.phone)).toEqual([true, true, true]);
    const close = [
      { x: 100, y: 100 },
      { x: 206, y: 100 },
      { x: 500, y: 200 },
    ];
    expect(roomyPins(close, W, MAP_PX.phone)).toEqual([false, false, true]);
  });

  it('measures the distance between centres, not along one axis', () => {
    // 75 units across and down: ≈ 43.7px apart on the phone, ≈ 101px from md
    const points = [
      { x: 100, y: 100 },
      { x: 175, y: 175 },
    ];
    expect(roomyPins(points, W, MAP_PX.phone)).toEqual([false, false]);
    expect(roomyPins(points, W, MAP_PX.wide)).toEqual([true, true]);
  });

  it('counts a lone pin as roomy', () => {
    expect(roomyPins([{ x: 10, y: 10 }], W, MAP_PX.phone)).toEqual([true]);
  });
});
