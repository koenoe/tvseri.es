import { describe, expect, it } from 'vitest';

import { GENRE_FALLBACK, landingLook, pickLeadColour } from './landingLook';

/** WCAG relative luminance of a six-digit hex */
const luminance = (hex: string) => {
  const value = Number.parseInt(hex.slice(1), 16);
  const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map(
    (part) => {
      const c = part / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    },
  );
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
};
const contrastWithWhite = (hex: string) => 1.05 / (luminance(hex) + 0.05);

describe('landingLook (each landing its own ground)', () => {
  it('draws the genre glow without a colour, and the same glow in the show’s hue with one', () => {
    expect(GENRE_FALLBACK.glow).toBe(
      'radial-gradient(ellipse 70% 90% at 15% 0%, rgb(196 120 64 / 0.16), rgb(196 120 64 / 0) 60%)',
    );
    expect(landingLook('#8a5a2b', GENRE_FALLBACK).glow).toMatch(
      /^radial-gradient\(ellipse 70% 90% at 15% 0%, rgb\((\d+ \d+ \d+) \/ 0\.16\), rgb\(\1 \/ 0\) 60%\)$/,
    );
  });

  it('takes the hue of the lead show’s colour, as a dark ground and a glow', () => {
    // a warm, Breaking Bad-like colour gives the genre's warm dark
    const look = landingLook('#8a5a2b', GENRE_FALLBACK);
    expect(look.ground).toMatch(/^#[0-9a-f]{6}$/);
    expect(look.ground).not.toBe(GENRE_FALLBACK.ground);
    expect(look.glow).toContain('radial-gradient');
    // warm: red over blue
    const value = Number.parseInt(look.ground.slice(1), 16);
    expect((value >> 16) & 255).toBeGreaterThan(value & 255);
  });

  it('gives two different colours two different grounds', () => {
    expect(landingLook('#2b5a8a', GENRE_FALLBACK).ground).not.toBe(
      landingLook('#8a2b4a', GENRE_FALLBACK).ground,
    );
  });

  it('keeps white text readable on any colour (at least 12:1, as the designed grounds)', () => {
    for (const colour of [
      '#ffffff',
      '#ffd400',
      '#00ff66',
      '#7f7f7f',
      '#2b5a8a',
    ]) {
      expect(
        contrastWithWhite(landingLook(colour, GENRE_FALLBACK).ground),
      ).toBeGreaterThan(12);
    }
  });

  it('never lightens: a near-black colour stays as dark as it is', () => {
    expect(landingLook('#080808', GENRE_FALLBACK).ground).toBe('#080808');
  });

  it('is the same for the same colour (stable between visits)', () => {
    expect(landingLook('#2b5a8a', GENRE_FALLBACK)).toEqual(
      landingLook('#2b5a8a', GENRE_FALLBACK),
    );
  });

  it('draws the designed fallback without a colour, or with the API’s unknown black', () => {
    expect(landingLook(null, GENRE_FALLBACK)).toEqual(GENRE_FALLBACK);
    expect(landingLook('#000000', GENRE_FALLBACK)).toEqual(GENRE_FALLBACK);
    expect(landingLook('red', GENRE_FALLBACK)).toEqual(GENRE_FALLBACK);
  });

  it('has no glow where the fallback has none (a theme: the tile carries the colour)', () => {
    expect(landingLook('#2b5a8a', { ground: '#151c1f' }).glow).toBeUndefined();
  });
});

describe('pickLeadColour', () => {
  it('takes the first candidate with a hue, so greys don’t all share one ground', () => {
    expect(pickLeadColour(['#333333', null, '#2b5a8a', '#8a2b4a'])).toBe(
      '#2b5a8a',
    );
  });

  it('keeps a grey when no candidate has a hue, and null without any', () => {
    expect(pickLeadColour(['#000000', '#333333'])).toBe('#333333');
    expect(pickLeadColour([null, '#000000'])).toBeNull();
  });
});
