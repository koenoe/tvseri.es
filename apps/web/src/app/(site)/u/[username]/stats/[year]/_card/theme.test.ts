import { describe, expect, it } from 'vitest';

import { cardColour, parseHex, themeStyle } from './theme';

describe('parseHex', () => {
  it('reads six and three digit colours, with or without #', () => {
    expect(parseHex('#1a74b6')).toEqual([26, 116, 182]);
    expect(parseHex('fff')).toEqual([255, 255, 255]);
  });

  it('is null for anything else', () => {
    expect(parseHex(null)).toBeNull();
    expect(parseHex('rgb(0,0,0)')).toBeNull();
  });
});

describe('cardColour', () => {
  it('uses the colour as the API serves it', () => {
    expect(cardColour('#1a74b6')).toBe('#1a74b6');
    expect(cardColour('#46462d')).toBe('#46462d');
    expect(cardColour('#fff')).toBe('#ffffff');
  });

  it('falls back to the default blue without a colour', () => {
    expect(cardColour(null)).toBe('#1a74b6');
    expect(cardColour('not a colour')).toBe('#1a74b6');
  });
});

describe('themeStyle', () => {
  it('draws Colour as a gradient for the default blue', () => {
    expect(themeStyle('colour', '#1a74b6')).toEqual({
      backgroundColor: '#0b2f4b',
      backgroundImage:
        'linear-gradient(170deg, #1a74b6 0%, #145b8f 45%, #0b2f4b 100%)',
      bracket: 'rgba(255,255,255,0.5)',
      soft: 'rgba(255,255,255,0.85)',
    });
  });

  it('draws Dark on the page ground whatever the colour', () => {
    const dark = themeStyle('dark', '#ffcc00');
    expect(dark.backgroundColor).toBe('#161b1c');
    expect(dark.soft).toBe('rgba(255,255,255,0.68)');
    expect(dark.bracket).toBe('rgba(255,255,255,0.3)');
  });
});
