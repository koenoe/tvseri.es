import { describe, expect, it } from 'vitest';

import { airedRange, episodesFact, runtimeRange } from './infoFacts';

describe('Information facts', () => {
  it('writes the aired range, open while the show runs', () => {
    const dates = {
      firstAirDate: '2022-06-23T00:00:00.000Z',
      lastAirDate: '2026-06-25T00:00:00.000Z',
    };
    expect(airedRange({ ...dates, status: 'Ended' })).toBe(
      'Jun 23, 2022 – Jun 25, 2026',
    );
    expect(airedRange({ ...dates, status: 'Returning Series' })).toBe(
      'Jun 23, 2022 – present',
    );
    expect(
      airedRange({ firstAirDate: '', lastAirDate: '', status: 'Ended' }),
    ).toBe('');
  });

  it('counts seasons and episodes, and the runtime range', () => {
    expect(episodesFact({ numberOfEpisodes: 47, numberOfSeasons: 5 })).toBe(
      '5 seasons · 47 episodes',
    );
    expect(episodesFact({ numberOfEpisodes: 1, numberOfSeasons: 1 })).toBe(
      '1 season · 1 episode',
    );
    expect(runtimeRange({ 1: [28, 20, 0], 2: [70] })).toBe('20–70 min');
    expect(runtimeRange({ 1: [28, 28] })).toBe('28 min');
    expect(runtimeRange({})).toBe('');
  });
});
