// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import { PLEX_HINT_KEY, PLEX_HINT_VERSION } from '@/lib/viewer/htmlHints';

import { persistPlexHint, toPlexHint } from './plexHint';

afterEach(() => window.localStorage.clear());

describe('plex hint', () => {
  it('is versioned, for one account, and caps the recent count', () => {
    expect(JSON.parse(toPlexHint('kit', 'on', 9))).toEqual({
      n: 5,
      s: 'on',
      u: 'kit',
      v: PLEX_HINT_VERSION,
    });
    expect(JSON.parse(toPlexHint('kit', 'none', -1)).n).toBe(0);
  });

  it('gives a broken card the waiting placeholder (same shape)', () => {
    expect(JSON.parse(toPlexHint('kit', 'broken', 0)).s).toBe('wait');
  });

  it('is stored for a signed-in viewer and not for a signed-out one', () => {
    persistPlexHint(null, 'on', 2);
    expect(window.localStorage.getItem(PLEX_HINT_KEY)).toBeNull();
    persistPlexHint('kit', 'paused', 2);
    expect(
      JSON.parse(window.localStorage.getItem(PLEX_HINT_KEY) ?? '{}'),
    ).toMatchObject({
      s: 'paused',
    });
  });
});
