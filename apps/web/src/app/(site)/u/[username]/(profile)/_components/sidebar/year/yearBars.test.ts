import { describe, expect, it } from 'vitest';

import { yearBars } from './yearBars';

const utc = (iso: string) => Date.parse(`${iso}T12:00:00Z`);

describe('yearBars', () => {
  const now = utc('2026-01-14');

  it('draws a bar per week up to this one, the last being this week', () => {
    const bars = yearBars([2, 4, 8], 2026, now);
    expect(bars).toHaveLength(3);
    expect(bars[2]).toMatchObject({ current: true, label: 'This week' });
    expect(bars[1]).toMatchObject({
      count: '4 episodes',
      current: false,
      episodes: 4,
      label: 'Jan 5 – Jan 11',
    });
  });

  it('scales to the busiest week with a 4px floor', () => {
    const bars = yearBars([0, 4, 8], 2026, now);
    expect(bars.map((bar) => bar.height)).toEqual([4, 28, 56]);
  });

  it('pads missing weeks with zero and says 1 episode', () => {
    const bars = yearBars([1], 2026, now);
    expect(bars[0]?.count).toBe('1 episode');
    expect(bars[2]?.count).toBe('0 episodes');
  });

  it('is flat for an empty year', () => {
    expect(yearBars([], 2026, now).every((bar) => bar.height === 4)).toBe(true);
  });
});
