import { describe, expect, it } from 'vitest';

import statsPath from './statsPath';

describe('statsPath', () => {
  it('builds the Stats URL with the username encoded', () => {
    expect(statsPath('nina', 2025)).toBe('/u/nina/stats/2025');
    expect(statsPath('a b', 2025)).toBe('/u/a%20b/stats/2025');
  });
});
