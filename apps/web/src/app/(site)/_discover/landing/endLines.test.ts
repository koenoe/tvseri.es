import { LANDING_TYPES } from '@tvseri.es/constants';
import { describe, expect, it } from 'vitest';

import { END_LINE, INDEX_END_LINE } from './endLines';

describe('END_LINE', () => {
  it.each(LANDING_TYPES)(
    '%s: one plain line, no repeat of the button',
    (type) => {
      expect(END_LINE[type]).toMatch(/^(Try|Follow) another \w+ next\.$/);
      expect(END_LINE[type]).not.toMatch(/lens|Discover/i);
    },
  );

  it('asks for another of the same kind', () => {
    expect(END_LINE.country).toBe('Try another country next.');
    expect(END_LINE.theme).toBe('Follow another theme next.');
  });

  it('the index pages have their own line', () => {
    expect(INDEX_END_LINE).toBe('There are more ways to browse.');
  });
});
