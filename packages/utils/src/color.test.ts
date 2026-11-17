import { describe, expect, it } from 'vitest';

import {
  channelsToHex,
  contrastRatio,
  hexChannels,
  hexWithAlpha,
  relativeLuminance,
} from './color';

describe('hexChannels', () => {
  it('splits a six-digit hex into its channels, in either case', () => {
    expect(hexChannels('#1c2223')).toEqual([28, 34, 35]);
    expect(hexChannels('#40102A')).toEqual([64, 16, 42]);
    expect(hexChannels('#ffffff')).toEqual([255, 255, 255]);
    expect(hexChannels('#000000')).toEqual([0, 0, 0]);
  });
});

describe('channelsToHex', () => {
  it('joins channels into a lowercase six-digit hex', () => {
    expect(channelsToHex([28, 34, 35])).toBe('#1c2223');
    expect(channelsToHex([0, 0, 0])).toBe('#000000');
  });

  it('rounds each channel', () => {
    expect(channelsToHex([27.6, 34.4, 255])).toBe('#1c22ff');
  });

  it('round-trips with hexChannels', () => {
    expect(channelsToHex(hexChannels('#29251f'))).toBe('#29251f');
  });
});

describe('hexWithAlpha', () => {
  it('writes the colour as space-separated rgb with an alpha', () => {
    expect(hexWithAlpha('#121813', 0.5)).toBe('rgb(18 24 19 / 0.5)');
    expect(hexWithAlpha('#121813', 0)).toBe('rgb(18 24 19 / 0)');
  });
});

describe('contrastRatio', () => {
  it('is 21 for black on white, in either order, and 1 for a colour on itself', () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 10);
    expect(contrastRatio([255, 255, 255], [0, 0, 0])).toBeCloseTo(21, 10);
    expect(contrastRatio([41, 37, 31], [41, 37, 31])).toBe(1);
  });

  it('reads the same with the old 0.03928 sRGB threshold for every 8-bit channel', () => {
    // No 8-bit channel falls between 0.03928 and 0.04045 (10/255 ≈ 0.0392,
    // 11/255 ≈ 0.0431), so no colour decision changes with the exact value
    const old = (channel: number) => {
      const c = channel / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    for (let channel = 0; channel <= 255; channel += 1) {
      expect(relativeLuminance([channel, 0, 0])).toBe(0.2126 * old(channel));
    }
  });
});
