import { describe, expect, it } from 'vitest';

import { headline, sentenceText, yearSentence } from './sentence';

const metrics = (
  episodeCount: number,
  seriesCount: number,
  totalRuntime: number,
  longestStreak: number,
) => ({ avgPerDay: 0, episodeCount, longestStreak, seriesCount, totalRuntime });

const summary2025 = {
  current: metrics(615, 71, 30_000, 42),
  previous: metrics(958, 69, 46_320, 8),
};

const base = {
  genres: ['Drama', 'Crime'],
  joinedYear: 2024,
  longestStreakYet: true,
  provider: 'Plex',
  username: 'nina',
} as const;

describe('headline', () => {
  it('reads the runtime and shows arrows', () => {
    expect(headline(summary2025, 'finished')).toBe('Fewer hours, more series');
    expect(
      headline(
        { current: metrics(9, 9, 900, 1), previous: metrics(5, 9, 100, 1) },
        'finished',
      ),
    ).toBe('More hours, as many series');
  });

  it('has none for a year in progress or without a year before', () => {
    expect(headline(summary2025, 'current')).toBeNull();
    expect(
      headline(
        { current: metrics(9, 9, 900, 1), previous: metrics(0, 0, 0, 0) },
        'finished',
      ),
    ).toBeNull();
  });
});

describe('yearSentence', () => {
  it('writes the 2025 sentence', () => {
    const parts = yearSentence({
      ...base,
      state: 'finished',
      summary: summary2025,
      year: 2025,
    });
    expect(sentenceText(parts)).toBe(
      '615 episodes of 71 series, 2w 6d 20h of TV. Mostly Drama and Crime, mostly on Plex. Fewer hours, more series: 71 series, and a 42-day streak, the longest yet.',
    );
    expect(
      parts.filter((part) => part.strong).map((part) => part.text),
    ).toEqual([
      '615',
      '71',
      '2w 6d 20h',
      'Drama',
      'Crime',
      'Plex',
      '71 series',
      '42-day streak',
    ]);
  });

  it('writes a year so far without a comparison', () => {
    const parts = yearSentence({
      ...base,
      genres: ['Crime', 'Drama'],
      provider: 'Netflix',
      state: 'current',
      summary: {
        current: metrics(137, 34, 7_260, 9),
        previous: summary2025.current,
      },
      year: 2026,
    });
    expect(sentenceText(parts)).toBe(
      '137 episodes of 34 series so far, 5d 1h of TV. Mostly Crime and Drama, mostly on Netflix.',
    );
  });

  it('marks the year the user joined', () => {
    const parts = yearSentence({
      ...base,
      state: 'finished',
      summary: {
        current: metrics(958, 69, 46_320, 8),
        previous: metrics(0, 0, 0, 0),
      },
      year: 2024,
    });
    expect(sentenceText(parts)).toBe(
      '958 episodes of 69 series, 4w 4d 4h of TV. The year nina joined tvseri.es.',
    );
  });

  it('says so for a year without episodes', () => {
    const empty = {
      current: metrics(0, 0, 0, 0),
      previous: metrics(0, 0, 0, 0),
    };
    expect(
      sentenceText(
        yearSentence({
          ...base,
          state: 'finished',
          summary: empty,
          year: 2023,
        }),
      ),
    ).toBe('Nothing logged in 2023.');
    expect(
      sentenceText(
        yearSentence({ ...base, state: 'current', summary: empty, year: 2026 }),
      ),
    ).toBe('Nothing logged in 2026 yet.');
  });
});
