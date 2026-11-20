// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import { PLEX_HINT_KEY, PLEX_HINT_VERSION } from '@/lib/viewer/htmlHints';

import { persistPlexHint, toPlexHint } from './plexHint';

afterEach(() => window.localStorage.clear());

describe('plex hint', () => {
  it('is versioned and for one account', () => {
    expect(JSON.parse(toPlexHint('kit', 'on'))).toEqual({
      s: 'on',
      u: 'kit',
      v: PLEX_HINT_VERSION,
    });
  });

  it('gives a broken card the waiting placeholder (same shape)', () => {
    expect(JSON.parse(toPlexHint('kit', 'broken')).s).toBe('wait');
  });

  it('is stored for a signed-in viewer and not for a signed-out one', () => {
    persistPlexHint(null, 'on');
    expect(window.localStorage.getItem(PLEX_HINT_KEY)).toBeNull();
    persistPlexHint('kit', 'paused');
    expect(
      JSON.parse(window.localStorage.getItem(PLEX_HINT_KEY) ?? '{}'),
    ).toMatchObject({
      s: 'paused',
    });
  });
});
