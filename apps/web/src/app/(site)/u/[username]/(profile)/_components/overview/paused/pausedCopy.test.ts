import { describe, expect, it } from 'vitest';

import { lastWatchedLine } from './pausedCopy';

const NOW = Date.UTC(2026, 10, 12, 15);

describe('Paused copy', () => {
  it('words the last watched day', () => {
    expect(lastWatchedLine({ lastWatchedAt: Date.UTC(2026, 7, 2) }, NOW)).toBe(
      'Last watched Aug 2',
    );
    expect(lastWatchedLine({ lastWatchedAt: Date.UTC(2025, 5, 1) }, NOW)).toBe(
      'Last watched Jun 1, 2025',
    );
  });
});
