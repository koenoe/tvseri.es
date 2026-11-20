import { describe, expect, it } from 'vitest';

import { activeTabScroll, hasStatsFromEpisodes, visibleTabs } from './tabs';

const labels = (facts: Parameters<typeof visibleTabs>[0]) =>
  visibleTabs(facts).map((tab) => tab.label);

const ESTABLISHED = { followers: 6, following: 8, hasStats: true };

describe('visibleTabs', () => {
  it('shows all six tabs on an established profile, yours or someone else’s', () => {
    expect(labels({ ...ESTABLISHED })).toEqual([
      'Overview',
      'Calendar',
      'Library',
      'History',
      'Circle',
      'Stats',
    ]);
  });

  it('is Overview · Calendar · Library · History on day 0', () => {
    expect(labels({ followers: 0, following: 0, hasStats: false })).toEqual([
      'Overview',
      'Calendar',
      'Library',
      'History',
    ]);
  });

  it('keeps Circle while either follow count is above 0', () => {
    expect(labels({ followers: 2, following: 0, hasStats: true })).toContain(
      'Circle',
    );
    expect(labels({ followers: 0, following: 1, hasStats: true })).toContain(
      'Circle',
    );
  });

  it('drops Stats without any stored episode', () => {
    expect(
      labels({ followers: 3, following: 3, hasStats: false }),
    ).not.toContain('Stats');
  });

  it('keeps a tab whose count did not load', () => {
    expect(
      labels({ followers: null, following: null, hasStats: null }),
    ).toEqual([
      'Overview',
      'Calendar',
      'Library',
      'History',
      'Circle',
      'Stats',
    ]);
    expect(labels({ followers: 0, following: null, hasStats: true })).toContain(
      'Circle',
    );
  });
});

describe('hasStatsFromEpisodes (the stored count, not the whole history)', () => {
  it('is whether any regular episode is watched; unknown when the count is', () => {
    expect(hasStatsFromEpisodes(12)).toBe(true);
    expect(hasStatsFromEpisodes(0)).toBe(false);
    expect(hasStatsFromEpisodes(null)).toBeNull();
  });
});

describe('the phone tab row keeps the active tab in view', () => {
  // six 64px tabs 2px apart after 4px of padding, in a 358px row
  const row = { clientWidth: 358, scrollWidth: 402, width: 64 };
  const leftOf = (index: number) => 4 + index * 66;

  it('rests at the start on the overview', () => {
    expect(activeTabScroll({ ...row, first: true, left: leftOf(0) })).toBe(0);
  });

  it('lands on Calendar with Overview half under the left fade', () => {
    expect(
      activeTabScroll({ ...row, first: false, left: leftOf(1) }),
    ).toBeCloseTo(34.8);
  });

  it('stops at the end of the row for the last tabs', () => {
    expect(activeTabScroll({ ...row, first: false, left: leftOf(5) })).toBe(44);
  });
});
