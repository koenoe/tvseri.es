import { describe, expect, it } from 'vitest';

import { channelsToHex, hexChannels, hexWithAlpha } from './color';

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
