import { describe, expect, it } from 'vitest';

import {
  closestLabel,
  finishLabel,
  progressLabel,
  seasonSegments,
  toGoLabel,
} from './almostDoneCopy';

describe('Almost done copy', () => {
  it('draws the episodes still to watch at the end of the season', () => {
    expect(seasonSegments({ seasonTotal: 6, unwatchedEpisodes: [6] })).toEqual({
      segments: [true, true, true, true, true, false],
      total: 6,
      watched: 5,
    });
    expect(
      seasonSegments({ seasonTotal: 10, unwatchedEpisodes: [9, 10] }),
    ).toMatchObject({ total: 10, watched: 8 });
  });

  it('draws a skipped episode where it sits, not in watching order', () => {
    // E01 skipped, E02–E06 watched ("0 of 1 episodes watched")
    expect(seasonSegments({ seasonTotal: 6, unwatchedEpisodes: [1] })).toEqual({
      segments: [false, true, true, true, true, true],
      total: 6,
      watched: 5,
    });
    expect(
      seasonSegments({ seasonTotal: 8, unwatchedEpisodes: [2, 7] }).segments,
    ).toEqual([true, false, true, true, true, true, false, true]);
  });

  it('never draws fewer segments than the episodes to go', () => {
    expect(seasonSegments({ seasonTotal: 0, unwatchedEpisodes: [3] })).toEqual({
      segments: [true, true, false],
      total: 3,
      watched: 2,
    });
  });

  it('words the lines', () => {
    expect(toGoLabel(2)).toBe('2 to go');
    expect(finishLabel(52)).toBe('52m to finish the season');
    expect(finishLabel(115)).toBe('1h 55m to finish the season');
    expect(finishLabel(null)).toBeNull();
    expect(progressLabel(5, 6)).toBe('5 of 6 episodes watched');
    expect(closestLabel(4)).toBe('4 episodes to go');
    expect(closestLabel(1)).toBe('1 episode to go');
  });
});
