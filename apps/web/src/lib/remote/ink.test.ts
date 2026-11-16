import { describe, expect, it } from 'vitest';

import { contrast, mixWithWhite, remoteInk } from './ink';

/** The steps of specs/remote_style.md §2 that must stay readable. */
function ratios(ink: string) {
  const key = mixWithWhite(ink, 0.06);
  return {
    // key labels on a key
    inkOnKey: contrast(ink, key),
    // the keyboard focus ring against white (non-text, 3:1)
    markOnWhite: contrast(mixWithWhite(ink, 0.52), '#ffffff'),
    // big-key meta and reasons on a key
    metaOnKey: contrast(mixWithWhite(ink, 0.72), key),
    // chip letters, hints and meta on the white sheet
    w64OnWhite: contrast(mixWithWhite(ink, 0.64), '#ffffff'),
  };
}

describe('remoteInk: the ink of the white remote surface', () => {
  it.each([
    ['the ground', '#1c2223'],
    ['The Bear', '#29251f'],
    ['the lightest colour the API allows', '#767676'],
    ['a mid tile colour', '#8a6d3b'],
    ['a light lilac', '#c8a2c8'],
    ['white', '#ffffff'],
    ['a saturated blue', '#3355ff'],
  ])('keeps every step readable for %s (%s)', (_, color) => {
    const steps = ratios(remoteInk(color));

    expect(steps.w64OnWhite).toBeGreaterThanOrEqual(4.5);
    expect(steps.metaOnKey).toBeGreaterThanOrEqual(4.5);
    expect(steps.markOnWhite).toBeGreaterThanOrEqual(3);
    expect(steps.inkOnKey).toBeGreaterThanOrEqual(7);
  });

  it('keeps a dark page colour as it is', () => {
    expect(remoteInk('#1c2223')).toBe('#1c2223');
    expect(remoteInk('#29251F')).toBe('#29251f');
  });

  it('darkens a light colour and keeps its hue', () => {
    const ink = remoteInk('#8a6d3b');

    expect(ink).not.toBe('#8a6d3b');
    const [r = 0, g = 0, b = 0] = [1, 3, 5].map((i) =>
      Number.parseInt(ink.slice(i, i + 2), 16),
    );
    expect(r).toBeGreaterThan(g);
    expect(g).toBeGreaterThan(b);
  });

  it('falls back to the ground for anything that is not a six-digit hex', () => {
    expect(remoteInk('red')).toBe('#1c2223');
    expect(remoteInk('#fff;}')).toBe('#1c2223');
    expect(remoteInk(undefined)).toBe('#1c2223');
  });

  it('measures contrast as WCAG does', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 0);
    expect(contrast('#767676', '#ffffff')).toBeCloseTo(4.54, 1);
  });
});
