import { describe, expect, it } from 'vitest';

import { nextDay, planOf } from './plan';

describe('the day plan', () => {
  it('plans the demo days of the moment rotation as the API does', () => {
    expect(planOf('2026-11-09')).toEqual({
      day: '2026-11-09',
      feature: 'binge',
      ifYouLiked: false,
      toy: 'whats-on',
    });
    expect(planOf('2026-11-10')).toEqual({
      day: '2026-11-10',
      feature: 'stills',
      ifYouLiked: true,
      toy: 'where-set',
    });
    expect(planOf('2026-11-11')).toEqual({
      day: '2026-11-11',
      feature: 'archive',
      ifYouLiked: false,
      toy: 'connected-by',
    });
  });

  it('finds the next day a kind is planned', () => {
    expect(nextDay('2026-11-15', (plan) => plan.toy === 'connected-by')).toBe(
      '2026-11-17',
    );
  });
});
