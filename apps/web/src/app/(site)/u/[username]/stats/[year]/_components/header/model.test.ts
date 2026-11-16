import { describe, expect, it } from 'vitest';

import {
  buildTiles,
  directionWord,
  longestStreakYet,
  streakBracket,
  weekTitle,
} from './model';

const metrics = (
  totalRuntime: number,
  episodeCount: number,
  avgPerDay: number,
  seriesCount: number,
  longestStreak: number,
) => ({ avgPerDay, episodeCount, longestStreak, seriesCount, totalRuntime });

const summary2025 = {
  current: metrics(30000, 615, 1.7, 71, 42),
  previous: metrics(46320, 958, 2.6, 69, 8),
};

describe('buildTiles', () => {
  it('draws the six tiles of a finished year with arrows and the year before', () => {
    const tiles = buildTiles({
      favorites: { current: 9, previous: 83 },
      firstYear: false,
      summary: summary2025,
      year: 2025,
    });
    expect(
      tiles.map(({ icon, label, value, delta }) => [
        icon,
        label,
        value,
        delta.direction,
        delta.amount,
        delta.versus,
      ]),
    ).toEqual([
      [
        'runtime',
        'Total runtime',
        '2w 6d 20h',
        'down',
        '35%',
        'vs. 4w 4d 4h (2024)',
      ],
      ['episodes', 'Episodes watched', '615', 'down', '36%', 'vs. 958 (2024)'],
      ['average', 'Average per day', '1.7', 'down', '35%', 'vs. 2.6 (2024)'],
      ['series', 'Series tracked', '71', 'up', '3%', 'vs. 69 (2024)'],
      ['streak', 'Longest streak', '42 days', 'up', '34', 'vs. 8 days (2024)'],
      ['favorites', 'Added to favourites', '9', 'down', '74', 'vs. 83 (2024)'],
    ]);
  });

  it('drops the arrow when nothing changed but keeps the vs. line', () => {
    const same = {
      current: metrics(600, 10, 0.5, 4, 3),
      previous: metrics(600, 10, 0.5, 4, 3),
    };
    const tiles = buildTiles({
      favorites: { current: 2, previous: 2 },
      firstYear: false,
      summary: same,
      year: 2025,
    });
    expect(tiles.map((tile) => tile.delta.direction)).toEqual(
      Array(6).fill(null),
    );
    expect(tiles[1]?.delta).toEqual({
      amount: null,
      direction: null,
      versus: 'vs. 10 (2024)',
    });
  });

  it('shows no change against a year with nothing in it', () => {
    const quiet = {
      current: metrics(600, 10, 0.5, 4, 3),
      previous: metrics(0, 0, 0, 0, 0),
    };
    const tiles = buildTiles({
      favorites: { current: 2, previous: 0 },
      firstYear: false,
      summary: quiet,
      year: 2025,
    });
    for (const tile of tiles) {
      expect(tile.delta).toEqual({ amount: null, direction: null, versus: '' });
    }
  });

  it('says so in the first year on tvseri.es', () => {
    const first = {
      current: metrics(46320, 958, 2.6, 69, 8),
      previous: metrics(0, 0, 0, 0, 0),
    };
    const tiles = buildTiles({
      favorites: { current: 83, previous: 0 },
      firstYear: true,
      summary: first,
      year: 2024,
    });
    expect(tiles.map((tile) => tile.delta)).toEqual(
      Array(6).fill({
        amount: null,
        direction: null,
        versus: 'First year on tvseri.es',
      }),
    );
    expect(tiles[4]?.value).toBe('8 days');
  });

  it('counts a single day as a day', () => {
    const one = {
      current: metrics(60, 1, 0, 1, 1),
      previous: metrics(60, 2, 0, 1, 2),
    };
    const tiles = buildTiles({
      favorites: { current: 0, previous: 0 },
      firstYear: false,
      summary: one,
      year: 2025,
    });
    expect(tiles[4]?.value).toBe('1 day');
    expect(tiles[4]?.delta.versus).toBe('vs. 2 days (2024)');
  });
});

describe('week tooltips', () => {
  it('names the episodes, singular and none', () => {
    expect(weekTitle(13)).toBe('13 episodes');
    expect(weekTitle(1)).toBe('1 episode');
    expect(weekTitle(0)).toBe('Nothing watched');
  });

  it('says which way a tile changed, in words', () => {
    expect(directionWord('up')).toBe('Up');
    expect(directionWord('down')).toBe('Down');
    expect(directionWord(null)).toBeNull();
  });
});

describe('streakBracket', () => {
  it('spans the weeks of the streak (Jan 4 to Feb 14, 2025 = weeks 0 to 6)', () => {
    const bracket = streakBracket(
      { days: 42, from: '2025-01-04', to: '2025-02-14' },
      2025,
    );
    expect(bracket?.left).toBeCloseTo(0, 5);
    expect(bracket?.width).toBeCloseTo(13.2075, 3);
    expect(bracket?.label).toBe('42 days in a row');
    expect(bracket?.labelAtEnd).toBe(false);
  });

  it('anchors the label at the end for a streak late in the year', () => {
    const bracket = streakBracket(
      { days: 10, from: '2025-12-10', to: '2025-12-19' },
      2025,
    );
    expect(bracket?.labelAtEnd).toBe(true);
  });

  it('has no bracket without a streak or for a single day', () => {
    expect(streakBracket(null, 2025)).toBeNull();
    expect(
      streakBracket({ days: 1, from: '2025-03-03', to: '2025-03-03' }, 2025),
    ).toBeNull();
  });
});

describe('longestStreakYet', () => {
  it('needs a streak longer than every other year', () => {
    expect(longestStreakYet(42, [8, 9])).toBe(true);
    expect(longestStreakYet(9, [42, 8])).toBe(false);
    expect(longestStreakYet(9, [9])).toBe(false);
    expect(longestStreakYet(5, [])).toBe(true);
    expect(longestStreakYet(0, [])).toBe(false);
  });
});
