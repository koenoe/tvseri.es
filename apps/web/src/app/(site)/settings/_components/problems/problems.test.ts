import { describe, expect, it } from 'vitest';

import type { ImportProblem, SeriesCandidate } from '@/lib/import/contract';
import { problemGroups, rowLabel, unmatchedLines } from './problems';

const candidate = (
  id: number,
  year: string,
  network: string,
): SeriesCandidate => ({
  id,
  network,
  posterImage: null,
  title: 'Top Boy',
  year,
});

const ambiguous = (index: number, title: string): ImportProblem => ({
  candidates: [
    candidate(1, '2019', 'Netflix'),
    candidate(2, '2011', 'Channel 4'),
  ],
  index,
  kind: 'ambiguous',
  row: { episode: 'Episode 1', season: 'Season 1', title },
});

const seriesNotFound = (
  index: number,
  title: string,
  episode = 'The Hunt',
): ImportProblem => ({
  index,
  kind: 'series-not-found',
  row: { episode, season: '', title },
});

const episodeNotFound = (index: number): ImportProblem => ({
  episodes: [{ episodeNumber: 1, seasonNumber: 2, title: 'Here We Woe Again' }],
  index,
  kind: 'episode-not-found',
  row: { episode: 'Part 1 Recap', season: 'Season 2', title: 'Wednesday' },
});

describe('rowLabel', () => {
  it('writes a Netflix row as it was in the file', () => {
    expect(
      rowLabel({
        episode: 'Part 1 Recap',
        season: 'Season 2',
        title: 'Wednesday',
      }),
    ).toBe('Wednesday: Season 2: Part 1 Recap');
    expect(
      rowLabel({ episode: 'The Hunt', season: '', title: 'Trust No One' }),
    ).toBe('Trust No One: The Hunt');
  });

  it('writes numeric columns as S02E10', () => {
    expect(rowLabel({ episode: '10', season: '2', title: 'Severance' })).toBe(
      'Severance · S02E10',
    );
  });
});

describe('unmatchedLines', () => {
  it('lists shows that share a name by rows, with the years, then unknown series and episodes', () => {
    const problems = [
      ambiguous(0, 'Unsolved Mysteries'),
      seriesNotFound(1, 'Trust No One'),
      ambiguous(2, 'Top Boy'),
      ambiguous(3, 'Top Boy'),
      seriesNotFound(4, 'Trust No One', 'Part 2'),
      seriesNotFound(5, 'Cobra Kai'),
      episodeNotFound(6),
    ];

    expect(unmatchedLines(problems)).toEqual([
      {
        count: '2 rows',
        key: 'amb:top boy',
        title: 'Top Boy',
        why: 'Two series have this name (2011 and 2019).',
      },
      {
        count: '1 row',
        key: 'amb:unsolved mysteries',
        title: 'Unsolved Mysteries',
        // Its candidates are Top Boy's: suggestions, not its name
        why: 'Series with similar names (2011 and 2019).',
      },
      {
        count: '3 rows',
        key: 'series',
        title: 'Trust No One: The Hunt, and 1 more',
        why: 'Look like films, not series.',
      },
      {
        count: '1 row',
        key: 'episodes',
        title: 'Wednesday: Season 2: Part 1 Recap',
        why: 'Recaps and extras that aren’t episodes.',
      },
    ]);
  });

  it('is empty when everything matched', () => {
    expect(unmatchedLines([])).toEqual([]);
  });
});

describe('problemGroups', () => {
  it('groups ambiguous rows by show, most rows first', () => {
    const { ambiguous: items } = problemGroups([
      ambiguous(0, 'Unsolved Mysteries'),
      ambiguous(1, 'Top Boy'),
      ambiguous(2, 'top boy '),
    ]);

    expect(items.map((item) => [item.key, item.title, item.indexes])).toEqual([
      ['amb:top boy', 'Top Boy', [1, 2]],
      ['amb:unsolved mysteries', 'Unsolved Mysteries', [0]],
    ]);
    expect(items[0]?.why).toBe('Two series have this name.');
    expect(items[0]?.candidates).toHaveLength(2);
  });

  it('counts the series offered: four with the name, or suggestions with another name', () => {
    const named = (n: number, title: string): SeriesCandidate => ({
      id: n,
      network: null,
      posterImage: null,
      title,
      year: null,
    });
    const { ambiguous: items } = problemGroups([
      {
        candidates: [1, 2, 3, 4].map((n) => named(n, 'Fit for TV')),
        index: 0,
        kind: 'ambiguous',
        row: { episode: '', season: '', title: 'Fit for TV' },
      },
      {
        // No series has the name: TMDB's one suggestion
        candidates: [named(5, 'Greatest Events of WWII in Color')],
        index: 1,
        kind: 'ambiguous',
        row: {
          episode: 'D-Day',
          season: '',
          title: 'Greatest Events of WWII in Colour',
        },
      },
      {
        candidates: [named(6, 'Wednesday Addams'), named(7, 'Wednesday')],
        index: 2,
        kind: 'ambiguous',
        row: { episode: 'Pilot', season: '', title: 'Wed' },
      },
    ]);
    expect(items.map((item) => item.why)).toEqual([
      'Four series have this name.',
      'A series with a similar name.',
      'Series with similar names.',
    ]);
    expect(
      unmatchedLines([
        {
          candidates: [named(5, 'Greatest Events of WWII in Color')],
          index: 1,
          kind: 'ambiguous',
          row: {
            episode: 'D-Day',
            season: '',
            title: 'Greatest Events of WWII in Colour',
          },
        },
      ])[0]?.why,
    ).toBe('A series with a similar name.');
  });

  it('puts unknown series (by show) and unknown episodes (by row) under Not found, in arrival order', () => {
    const { notFound } = problemGroups([
      seriesNotFound(0, 'Trust No One'),
      episodeNotFound(1),
      seriesNotFound(2, 'Trust No One', 'Part 2'),
      {
        index: 3,
        kind: 'failed',
        row: { episode: '1', season: '1', title: 'Dark' },
      },
    ]);

    expect(
      notFound.map((item) => [item.key, item.title, item.indexes, item.why]),
    ).toEqual([
      [
        'sn:trust no one',
        'Trust No One',
        [0, 2],
        'Could not find series “Trust No One”',
      ],
      [
        'en:1',
        'Wednesday: Season 2: Part 1 Recap',
        [1],
        'Could not find episode “Part 1 Recap”',
      ],
      ['fail:3', 'Dark · S01E01', [3], 'Couldn’t save this one'],
    ]);
    expect(notFound[1]?.episodes).toHaveLength(1);
  });

  it('keeps a one-row unknown series as the row was written', () => {
    const { notFound } = problemGroups([seriesNotFound(0, 'Trust No One')]);
    expect(notFound[0]?.title).toBe('Trust No One: The Hunt');
  });

  it('keys follow-up problems apart from the first ones', () => {
    const { notFound } = problemGroups([episodeNotFound(1)], 2);
    expect(notFound[0]?.key).toBe('en:1#2');
  });
});
