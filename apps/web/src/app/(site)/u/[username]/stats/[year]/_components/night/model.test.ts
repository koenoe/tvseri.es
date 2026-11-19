import { describe, expect, it } from 'vitest';

import {
  alsoBigText,
  bingeText,
  dominantSeries,
  longDay,
  nightLine,
  pickBinge,
} from './model';

const ep = (seriesId: number, seasonNumber: number, episodeNumber: number) => ({
  episodeNumber,
  seasonNumber,
  seriesId,
  slug: `s-${seriesId}`,
  title: `Show ${seriesId}`,
});

const run = (season: number, from: number, to: number, seriesId = 1) =>
  Array.from({ length: to - from + 1 }, (_, index) =>
    ep(seriesId, season, from + index),
  );

const seasons12 = [
  { episodes: 10, number: 1 },
  { episodes: 12, number: 2 },
];

describe('dominantSeries', () => {
  it('takes the show with most episodes, the first on a tie', () => {
    const items = [ep(2, 1, 1), ep(1, 1, 1), ep(1, 1, 2), ep(2, 1, 2)];
    expect(dominantSeries(items)).toMatchObject({ seriesId: 2 });
    expect(dominantSeries(items)?.items).toHaveLength(2);
    expect(
      dominantSeries([ep(3, 1, 1), ep(4, 1, 1), ep(4, 1, 2)]),
    ).toMatchObject({ seriesId: 4 });
    expect(dominantSeries([])).toBeUndefined();
  });
});

describe('nightLine', () => {
  it('says the back half from the middle to the end', () => {
    expect(nightLine(run(2, 7, 12), seasons12)).toBe(
      'The back half of season 2',
    );
  });

  it('says the first half from the start to the middle', () => {
    expect(nightLine(run(2, 1, 6), seasons12)).toBe(
      'The first half of season 2',
    );
    expect(nightLine(run(2, 1, 4), seasons12)).toBe(
      'The first half of season 2',
    );
  });

  it('says all of a season', () => {
    expect(nightLine(run(2, 1, 12), seasons12)).toBe('All of season 2');
  });

  it('says the whole show when every season was watched', () => {
    expect(nightLine([...run(1, 1, 10), ...run(2, 1, 12)], seasons12)).toBe(
      'The whole series',
    );
    expect(nightLine(run(1, 1, 4), [{ episodes: 4, number: 1 }])).toBe(
      'The whole series',
    );
  });

  it('says one episode by its number', () => {
    expect(nightLine(run(2, 7, 7), seasons12)).toBe('Episode 7');
  });

  it('counts anything else', () => {
    expect(nightLine(run(2, 3, 6), seasons12)).toBe('4 episodes of season 2');
    expect(nightLine(run(2, 5, 12), seasons12)).toBe('8 episodes of season 2');
    expect(nightLine([...run(1, 9, 10), ...run(2, 1, 3)], seasons12)).toBe(
      '5 episodes across 2 seasons',
    );
  });

  it('counts when the season size is unknown', () => {
    expect(nightLine(run(2, 7, 12), [])).toBe('6 episodes of season 2');
    expect(nightLine(run(2, 1, 12), null)).toBe('12 episodes of season 2');
  });
});

describe('nightLine on a show TMDB numbers on across seasons', () => {
  // S1 is E1…E10, S2 E11…E22
  const numberedOn = [
    { episodes: 10, number: 1 },
    { episodes: 12, firstEpisodeNumber: 11, number: 2 },
  ];

  it('says all, the halves and the whole show by the real numbers', () => {
    expect(nightLine(run(2, 11, 22), numberedOn)).toBe('All of season 2');
    expect(nightLine(run(2, 17, 22), numberedOn)).toBe(
      'The back half of season 2',
    );
    expect(nightLine(run(2, 11, 16), numberedOn)).toBe(
      'The first half of season 2',
    );
    expect(nightLine([...run(1, 1, 10), ...run(2, 11, 22)], numberedOn)).toBe(
      'The whole series',
    );
  });

  it('never covers a season with made-up codes', () => {
    expect(nightLine(run(2, 1, 12), numberedOn)).toBe(
      '12 episodes of season 2',
    );
  });
});

describe('alsoBigText', () => {
  const night = [ep(9, 1, 1), ep(9, 1, 2), ep(9, 1, 3), ep(9, 1, 4)];

  it('says all N when the night covered the show', () => {
    expect(alsoBigText(night, '2025-03-15', [{ episodes: 4, number: 1 }])).toBe(
      'Also big: Show 9, all 4 on Sat Mar 15',
    );
  });

  it('counts the episodes otherwise', () => {
    expect(alsoBigText(night, '2025-03-15', [{ episodes: 8, number: 1 }])).toBe(
      'Also big: Show 9, 4 episodes on Sat Mar 15',
    );
    expect(alsoBigText(night, '2025-03-15', null)).toBe(
      'Also big: Show 9, 4 episodes on Sat Mar 15',
    );
    expect(alsoBigText([], '2025-03-15', null)).toBeUndefined();
  });
});

describe('longDay', () => {
  it('writes the day out for the card’s name', () => {
    expect(longDay('2025-12-27')).toBe('Saturday December 27');
  });
});

const DAY = 24 * 60 * 60 * 1000;
const show = (
  id: number,
  episodes: number,
  first: string,
  days: number,
  title = `Show ${id}`,
) => ({
  episodes,
  firstWatchedAt: Date.parse(`${first}T20:00:00Z`),
  id,
  lastWatchedAt: Date.parse(`${first}T20:00:00Z`) + (days - 1) * DAY,
  posterImage: null,
  runtimeMinutes: episodes * 50,
  slug: `show-${id}`,
  title,
  weeks: [],
});

describe('pickBinge', () => {
  it('takes the show with the most episodes within a month', () => {
    const picked = pickBinge([
      show(1, 60, '2025-01-01', 200),
      show(2, 36, '2025-08-05', 21),
      show(3, 20, '2025-03-01', 5),
    ]);
    expect(picked?.id).toBe(2);
  });

  it('prefers the shorter span on a tie', () => {
    expect(
      pickBinge([show(1, 10, '2025-03-01', 20), show(2, 10, '2025-04-01', 8)])
        ?.id,
    ).toBe(2);
  });

  it('needs at least four episodes and a span of 31 days at most', () => {
    expect(pickBinge([show(1, 3, '2025-03-01', 1)])).toBeUndefined();
    expect(pickBinge([show(1, 30, '2025-03-01', 32)])).toBeUndefined();
    expect(pickBinge([show(1, 30, '2025-03-01', 31)])?.id).toBe(1);
  });
});

describe('bingeText', () => {
  const seasons4 = [1, 2, 3, 4].map((number) => ({ episodes: 9, number }));

  it('says all seasons in weeks of the month', () => {
    expect(bingeText(show(1, 36, '2025-08-05', 21, 'Barry'), seasons4)).toBe(
      'Barry, all 4 seasons in 3 weeks of August',
    );
  });

  it('counts episodes when not everything was watched', () => {
    expect(bingeText(show(1, 20, '2025-08-05', 21, 'Barry'), seasons4)).toBe(
      'Barry, 20 episodes in 3 weeks of August',
    );
    expect(bingeText(show(1, 20, '2025-08-05', 21, 'Barry'), null)).toBe(
      'Barry, 20 episodes in 3 weeks of August',
    );
  });

  it('says days under a week and leaves the month out across two', () => {
    expect(
      bingeText(show(1, 8, '2025-08-05', 5, 'Barry'), [
        { episodes: 8, number: 1 },
      ]),
    ).toBe('Barry, all 8 episodes in 5 days of August');
    expect(bingeText(show(1, 12, '2025-08-25', 14, 'Barry'), null)).toBe(
      'Barry, 12 episodes in 2 weeks',
    );
  });
});
