import { describe, expect, it } from 'vitest';

import { ratingLabel } from './episodeRatings';

describe('ratingLabel', () => {
  const view = { '5': 8, '6': 9.6, '7': null };

  it('reads one decimal', () => {
    expect(ratingLabel(view, 6)).toBe('9.6');
    expect(ratingLabel(view, 5)).toBe('8.0');
  });

  it('has no label when the rating is missing or still loading', () => {
    expect(ratingLabel(view, 7)).toBeNull();
    expect(ratingLabel(view, 9)).toBeNull();
    expect(ratingLabel(null, 6)).toBeNull();
    expect(ratingLabel(undefined, 6)).toBeNull();
  });
});
