import { describe, expect, it } from 'vitest';

import { formatWatchTime } from './format';

describe('durations', () => {
  it('time watched', () => {
    expect(formatWatchTime(230)).toBe('3h 50m');
    expect(formatWatchTime((5 * 24 + 1) * 60)).toBe('5d 1h');
    expect(formatWatchTime((22 * 24 + 9) * 60)).toBe('22d 9h');
    expect(formatWatchTime(3 * 24 * 60)).toBe('3d');
  });
});
