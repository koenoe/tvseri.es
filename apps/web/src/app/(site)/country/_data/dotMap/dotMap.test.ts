import { landingFilter } from '@tvseri.es/constants';
import { describe, expect, it } from 'vitest';

import { DOT_MAP_DATASET } from './dataset';
import { dotMapPaths } from './dotMap';

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

  it('has no map for a code without a shape', () => {
    expect(dotMapPaths('zz', 'desktop')).toBeUndefined();
    expect(dotMapPaths('constructor', 'desktop')).toBeUndefined();
  });
});
