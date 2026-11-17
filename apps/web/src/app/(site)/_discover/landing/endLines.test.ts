import { LANDING_TYPES } from '@tvseri.es/constants';
import { describe, expect, it } from 'vitest';

import { END_LINE } from './endLines';

describe('END_LINE', () => {
  it.each(LANDING_TYPES)(
    '%s: one plain line, no repeat of the button',
    (type) => {
      expect(END_LINE[type]).toMatch(/^(Try|Follow) another \w+ next\.$/);
      expect(END_LINE[type]).not.toMatch(/lens|Discover/i);
    },
  );
});
