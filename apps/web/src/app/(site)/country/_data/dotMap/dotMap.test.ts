import { landingFilter } from '@tvseri.es/constants';
import { describe, expect, it } from 'vitest';

import { DOT_MAP_DATASET } from './dataset';
import { dotMapPaths } from './dotMap';
import { WINDOWS, ZOOM } from './grid';

const dots = (path: string) => path.split('h0').length - 1;

describe('the dataset', () => {
  it('only has codes the country landing accepts', () => {
    for (const code of DOT_MAP_DATASET.codes) {
      expect(landingFilter('country', code.toLowerCase())).toBeDefined();
    }
  });

  it('has a window per code for both variants', () => {
    for (const variant of ['desktop', 'phone'] as const) {
      expect(Object.keys(DOT_MAP_DATASET[variant].windows).sort()).toEqual(
        [...DOT_MAP_DATASET.codes].sort(),
      );
    }
  });

  it.each(['FR', 'NO'])(
    'maps Natural Earth -99 codes to their fallback (%s)',
    (code) => {
      expect(DOT_MAP_DATASET.codes).toContain(code);
    },
  );
});

describe('dotMapPaths', () => {
  it('lights the country on its world window', () => {
    const paths = dotMapPaths('gb', 'desktop');
    expect(dots(paths?.own ?? '')).toBeGreaterThan(200);
    expect(dots(paths?.rest ?? '')).toBeGreaterThan(500);
  });

  it('accepts the code in either case', () => {
    expect(dotMapPaths('KR', 'phone')).toEqual(dotMapPaths('kr', 'phone'));
  });

  it('zooms in on a tiny country', () => {
    expect(dots(dotMapPaths('mt', 'desktop')?.own ?? '')).toBeGreaterThan(10);
  });

  it('gives every known country at least one dot', () => {
    for (const code of DOT_MAP_DATASET.codes) {
      for (const variant of ['desktop', 'phone'] as const) {
        expect(dots(dotMapPaths(code, variant)?.own ?? '')).toBeGreaterThan(0);
      }
    }
  });

  it('zooms out on a big country, so it never fills its window', () => {
    for (const variant of ['desktop', 'phone'] as const) {
      const { cols, rows } = WINDOWS[variant];
      const max = Math.floor(ZOOM.maxShare * cols * rows);
      // Antarctica fills any window down to the smallest zoom
      const codes = DOT_MAP_DATASET.codes.filter((code) => code !== 'AQ');
      const full = codes.filter(
        (code) => dots(dotMapPaths(code, variant)?.own ?? '') > max,
      );
      expect(full, variant).toEqual([]);
    }
  });

  it('keeps a country that fits at world scale (Malaysia)', () => {
    for (const variant of ['desktop', 'phone'] as const) {
      expect(Array.isArray(DOT_MAP_DATASET[variant].windows.MY)).toBe(true);
    }
  });

  it('has no map for a code without a shape', () => {
    expect(dotMapPaths('zz', 'desktop')).toBeUndefined();
    expect(dotMapPaths('constructor', 'desktop')).toBeUndefined();
  });
});
