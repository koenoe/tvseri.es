import { describe, expect, it } from 'vitest';

import { spotlightLineText } from './spotlightLines';

describe('spotlightLineText', () => {
  it('writes the personal lines', () => {
    expect(spotlightLineText({ kind: 'favorite', title: 'Severance' })).toBe(
      'Like Severance, which you favourited',
    );
    expect(spotlightLineText({ kind: 'finished', title: 'The Bear' })).toBe(
      'Like The Bear, which you finished',
    );
    expect(
      spotlightLineText({ kind: 'up-to-date', title: 'Slow Horses' }),
    ).toBe('Like Slow Horses, which you are up to date with');
    expect(
      spotlightLineText({ genre: 'Sci-Fi & Fantasy', kind: 'top-rated' }),
    ).toBe('Top rated in Sci-Fi & Fantasy that you haven’t seen');
  });
});
