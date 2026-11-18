import { describe, expect, it } from 'vitest';

import { groundColor, groundColorOr, quietTextContrast } from './groundColor';

const rgb = (hex: string) =>
  [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16)) as [
    number,
    number,
    number,
  ];

/** The share of the input each channel kept (one share for all three) */
const shares = (input: string, output: string) =>
  rgb(input).map((channel, index) =>
    channel === 0 ? null : rgb(output)[index]! / channel,
  );

// Every other test measures through quietTextContrast, so a wrong opacity
// there would pass them all: pin it to ratios worked out by hand
describe('quietTextContrast', () => {
  it('measures white at 60% composited on the ground against the ground', () => {
    expect(quietTextContrast([255, 255, 255])).toBe(1);
    expect(quietTextContrast(rgb('#29251f'))).toBeCloseTo(6.4, 1);
    expect(quietTextContrast([0, 0, 0])).toBeCloseTo(7.37, 2);
  });
});

describe('groundColor', () => {
  it('serves white as the grey of the step that first passes', () => {
    expect(groundColor('#ffffff')).toBe('#474747');
  });

  it.each([
    // dark grounds pass unchanged
    ['The Bear', '#29251f'],
    ['the default ground', '#1c2223'],
    ['near-black', '#0b0c0e'],
    ['black', '#000000'],
    ['a deep navy', '#182858'],
  ])('keeps %s (%s) as it is', (_, colour) => {
    expect(groundColor(colour)).toBe(colour);
  });

  it.each([
    ['a pale sky', '#a9c4d8'],
    ['mustard yellow', '#d9a521'],
    ['white-ish', '#f2efe8'],
    ['white', '#ffffff'],
    ['a mid grey', '#808080'],
    ['a teal stored under the old rule (white 4.5:1)', '#487c7c'],
    ['a sage', '#8a9a7b'],
    ['a saturated red', '#e50a07'],
  ])('darkens %s (%s) until white/60 text reads at 4.5:1', (_, colour) => {
    const ground = groundColor(colour)!;
    expect(ground).not.toBe(colour);
    expect(quietTextContrast(rgb(ground))).toBeGreaterThanOrEqual(4.5);
  });

  it('takes the lightest 4% step that passes, not a darker one', () => {
    for (const colour of ['#a9c4d8', '#d9a521', '#f2efe8', '#808080']) {
      const ground = groundColor(colour)!;
      const share = Math.max(
        ...shares(colour, ground).filter((s): s is number => s !== null),
      );
      const lighter = rgb(colour).map((channel) =>
        Math.round(channel * (share + 0.04)),
      ) as [number, number, number];
      expect(quietTextContrast(lighter)).toBeLessThan(4.5);
    }
  });

  it('keeps the hue: every channel scaled by the same share', () => {
    const ground = groundColor('#d9a521')!;
    const [r, g, b] = rgb(ground);
    expect(r).toBeGreaterThan(g);
    expect(g).toBeGreaterThan(b);
    const [sr, sg] = shares('#d9a521', ground) as [number, number];
    expect(Math.abs(sr - sg)).toBeLessThan(0.02);
  });

  it('keeps a grey neutral', () => {
    const [r, g, b] = rgb(groundColor('#c8c8c8')!);
    expect(r).toBe(g);
    expect(g).toBe(b);
  });

  it('is idempotent: a served colour comes back unchanged', () => {
    for (const colour of ['#a9c4d8', '#d9a521', '#f2efe8', '#487c7c']) {
      const once = groundColor(colour)!;
      expect(groundColor(once)).toBe(once);
    }
  });

  it('lowercases and accepts uppercase hex', () => {
    expect(groundColor('#29251F')).toBe('#29251f');
  });

  it('holds for every colour (a sweep of the RGB cube)', () => {
    for (let r = 0; r < 256; r += 15) {
      for (let g = 0; g < 256; g += 15) {
        for (let b = 0; b < 256; b += 15) {
          const hex = `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
          expect(
            quietTextContrast(rgb(groundColor(hex)!)),
          ).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  it.each([
    ['a name', 'red'],
    ['a style break-out', '#fff;}body{display:none}'],
    ['three digits', '#fff'],
    ['eight digits', '#11223344'],
    ['no hash', '1a2b3c'],
    ['whitespace', ' #1a2b3c'],
    ['empty', ''],
    ['undefined', undefined],
    ['null', null],
    ['a number', 0x1a2b3c],
  ])('refuses %s', (_, value) => {
    expect(groundColor(value)).toBeUndefined();
    expect(groundColorOr(value, '#000000')).toBe('#000000');
  });
});
