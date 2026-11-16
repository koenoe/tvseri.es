import { describe, expect, it } from 'vitest';
import { rangeOf, sharedDirFor, streamOf } from './context.ts';

describe('streamOf', () => {
  it.each([
    ['tvseri.es-show', 'show'],
    ['tvseri.es-show-hero', 'show'],
    ['tvseri.es-discover-dotmap', 'discover'],
    ['tvseri.es-global-search', 'global'],
    ['tvseri.es-ops', 'other'],
    ['tvseri.es-redesign', 'other'],
    ['tvseri.es', 'main'],
    ['elsewhere', 'other'],
  ])('%s → %s', (folder, stream) => {
    expect(streamOf(folder, 'tvseri.es')).toBe(stream);
  });
});

describe('rangeOf', () => {
  it('gives each stream its ten ports and everything else 3190–3199', () => {
    expect(rangeOf('show')).toEqual({ first: 3110, last: 3119 });
    expect(rangeOf('settings')).toEqual({ first: 3180, last: 3189 });
    expect(rangeOf('other')).toEqual({ first: 3190, last: 3199 });
    expect(rangeOf('main')).toEqual({ first: 3190, last: 3199 });
  });
});

describe('sharedDirFor', () => {
  it('sits next to the main checkout unless overridden', () => {
    expect(sharedDirFor('/work/repo', {})).toBe('/work/.tvseries-agents');
    expect(sharedDirFor('/work/repo', { TVSERIES_AGENTS_DIR: '/x/y' })).toBe(
      '/x/y',
    );
  });
});
