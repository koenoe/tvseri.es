import { describe, expect, it } from 'vitest';

import { DEFAULT_GROUND, mixHex, networkLook } from './look';

describe('networkLook', () => {
  it('gives a monochrome logo a white wash and a white logo (HBO)', () => {
    expect(networkLook('hbo')).toEqual({
      ground: '#0e0e10',
      keepLogo: false,
      wash: {
        desktop:
          'radial-gradient(1200px 820px at 8% 0%,rgba(255,255,255,.08),rgba(255,255,255,0) 72%)',
        phone:
          'radial-gradient(420px 360px at 10% 0%,rgba(255,255,255,.08),rgba(255,255,255,0) 72%)',
      },
    });
  });

  it('draws Apple TV with its own ground and a softer wash', () => {
    const look = networkLook('apple-tv');
    expect(look.ground).toBe('#121214');
    expect(look.wash.desktop).toBe(
      'radial-gradient(1200px 820px at 8% 0%,rgba(255,255,255,.07),rgba(255,255,255,0) 72%)',
    );
  });

  it('washes in the logo colour and keeps a coloured logo (Netflix)', () => {
    expect(networkLook('netflix')).toEqual({
      ground: '#110c0d',
      keepLogo: true,
      wash: {
        desktop:
          'radial-gradient(1300px 900px at 8% 0%,rgba(229,9,20,.3),rgba(229,9,20,0) 72%)',
        phone:
          'radial-gradient(420px 360px at 10% 0%,rgba(229,9,20,.3),rgba(229,9,20,0) 72%)',
      },
    });
  });

  it('tints the ground of a coloured network the design does not draw', () => {
    const look = networkLook('hulu');
    expect(look.keepLogo).toBe(true);
    expect(look.ground).toBe(mixHex(DEFAULT_GROUND, '#1ce783', 0.04));
    expect(look.ground).not.toBe(DEFAULT_GROUND);
  });

  it('treats any other network as monochrome on the default ground', () => {
    const look = networkLook('bbc-one');
    expect(look.ground).toBe(DEFAULT_GROUND);
    expect(look.keepLogo).toBe(false);
  });
});

describe('mixHex', () => {
  it('mixes channel by channel', () => {
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mixHex('#0e0e10', '#e50914', 0)).toBe('#0e0e10');
    expect(mixHex('#0e0e10', '#e50914', 1)).toBe('#e50914');
  });
});
