import { describe, expect, it } from 'vitest';

import { formatCappedCount } from './formatCount';

describe('formatCappedCount', () => {
  it('groups a count', () => {
    expect(formatCappedCount(10_927)).toBe('10,927');
  });

  it("writes TMDB's cap as at least 20,000", () => {
    expect(formatCappedCount(20_001)).toBe('20,000+');
    expect(formatCappedCount(20_000)).toBe('20,000');
  });
});
