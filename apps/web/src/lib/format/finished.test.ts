import { describe, expect, it } from 'vitest';

import { finishedLabel } from './finished';

// Thu 12 Nov 2026
const NOW = Date.UTC(2026, 10, 12, 15);

describe('finishedLabel', () => {
  it('this year: the day', () => {
    const day = Date.UTC(2026, 10, 3);
    expect(finishedLabel(day, NOW)).toBe('Finished Nov 3');
    expect(finishedLabel(day, NOW, { verb: 'Caught up' })).toBe(
      'Caught up Nov 3',
    );
  });

  it('an earlier year: month and year, on every page', () => {
    const day = Date.UTC(2025, 2, 3);
    expect(finishedLabel(day, NOW)).toBe('Finished Mar 2025');
    expect(finishedLabel(day, NOW, { verb: 'Caught up' })).toBe(
      'Caught up Mar 2025',
    );
  });
});
