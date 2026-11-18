import { describe, expect, it } from 'vitest';

import { hasStatsFromEpisodes, visibleTabs } from './tabs';

const labels = (facts: Parameters<typeof visibleTabs>[0]) =>
  visibleTabs(facts).map((tab) => tab.label);

describe('visibleTabs', () => {
  it('shows all five tabs for an established profile', () => {
    expect(labels({ followers: 6, following: 8, hasStats: true })).toEqual([
      'Overview',
      'Library',
      'History',
      'Circle',
      'Stats',
    ]);
  });

  it('is Overview · Library · History on day 0', () => {
    expect(labels({ followers: 0, following: 0, hasStats: false })).toEqual([
      'Overview',
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
    ).toEqual(['Overview', 'Library', 'History', 'Circle', 'Stats']);
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
