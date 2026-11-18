import { describe, expect, it } from 'vitest';

import { seasonFacts, seasonFactsEstimate } from './facts';
import { markEpisodes } from './marks';
import { record, season, view } from './testData';

const RUNTIMES = [37, 30, 28, 32, 36, 33, 30, 29, 34, 42];

function facts(
  watchedCount: number,
  aired = 10,
  skipped: ReadonlyArray<`S${string}E${string}`> = [],
) {
  const watched = Object.fromEntries(
    Array.from({ length: watchedCount }, (_, index) => [
      `S03E${String(index + 1).padStart(2, '0')}`,
      record(1),
    ]),
  );
  const marked = markEpisodes(
    view({
      seasons: [
        { airedEpisodeCount: aired, episodeCount: 10, seasonNumber: 3 },
      ],
      skipped,
      watched,
    }),
    3,
    season(3, 10, RUNTIMES).map((episode) => ({
      ...episode,
      airDate: episode.episodeNumber === 7 ? '2026-11-13' : '2024-06-26',
    })),
    null,
  );
  return seasonFacts(marked, '2024-06-26');
}

describe('seasonFacts', () => {
  it('not started: episodes and the whole runtime', () => {
    expect(facts(0)).toEqual({
      count: '10 episodes',
      date: 'Jun 26, 2024',
      last: { kind: 'clock', text: '5h 31m' },
      skipped: null,
    });
  });

  it('in progress: watched of all and the time left', () => {
    expect(facts(4)).toMatchObject({
      count: '4 of 10 watched',
      last: { kind: 'clock', text: '3h 24m left' },
    });
  });

  it('counts skipped as not watched, says so, and never as time left', () => {
    // E05 (36m) skipped: left is E06 to E10, as Next up counts
    expect(facts(4, 10, ['S03E05'])).toMatchObject({
      count: '4 of 10 watched',
      last: { kind: 'clock', text: '2h 48m left' },
      skipped: '1 skipped',
    });
  });

  it('complete: the eye and Watched', () => {
    expect(facts(10)).toMatchObject({
      count: '10 episodes',
      last: { kind: 'eye', text: 'Watched' },
    });
  });

  it('airing: aired only, and the next day in pink', () => {
    expect(facts(0, 6)).toMatchObject({
      count: '0 of 6 watched',
      date: 'Jun 26, 2024',
      last: { kind: 'pink', text: 'Next E07 Fri' },
    });
  });

  it('announced with a premiere date: the date and the pink next day', () => {
    const marked = markEpisodes(
      view({
        seasons: [{ airedEpisodeCount: 0, episodeCount: 9, seasonNumber: 5 }],
      }),
      5,
      season(5, 9).map((episode) => ({ ...episode, airDate: '2027-06-01' })),
      null,
    );
    expect(seasonFacts(marked, '')).toEqual({
      count: '9 episodes',
      date: 'Jun 1, 2027',
      last: { kind: 'pink', text: 'Next E01 Tue' },
      skipped: null,
    });
  });

  it('announced without any date: "Announced"', () => {
    const marked = markEpisodes(
      view({
        seasons: [{ airedEpisodeCount: 0, episodeCount: 9, seasonNumber: 5 }],
      }),
      5,
      season(5, 9).map((episode) => ({ ...episode, airDate: '' })),
      null,
    );
    expect(seasonFacts(marked, '')).toEqual({
      count: '9 episodes',
      date: 'Announced',
      last: { kind: 'pink', text: 'Next E01' },
      skipped: null,
    });
  });

  it('signed out, an airing season counts its episodes, not "0 of 6 watched"', () => {
    expect(facts(0, 6)).toMatchObject({ count: '0 of 6 watched' });
    const marked = markEpisodes(
      view({
        seasons: [{ airedEpisodeCount: 6, episodeCount: 10, seasonNumber: 3 }],
      }),
      3,
      season(3, 10, RUNTIMES),
      null,
    );
    expect(seasonFacts(marked, '2024-06-26', false)).toMatchObject({
      count: '10 episodes',
    });
  });
});

describe('seasonFacts: a full-season drop', () => {
  // Every episode dated the same day; the show's count says only E01 aired.
  const drop = season(1, 8, Array(8).fill(0)).map((episode) => ({
    ...episode,
    airDate: '2026-11-13',
    hasAired: true,
  }));
  const marked = markEpisodes(
    view({
      seasons: [{ airedEpisodeCount: 1, episodeCount: 8, seasonNumber: 1 }],
    }),
    1,
    drop,
    { episodeNumber: 1, seasonNumber: 1 },
  );

  it('counts every episode as out by its own air date', () => {
    expect(marked.map((item) => item.mark)).toEqual([
      'next',
      'open',
      'open',
      'open',
      'open',
      'open',
      'open',
      'open',
    ]);
  });

  it('invents no runtime when the API has none', () => {
    expect(seasonFacts(marked, '2026-11-13')).toEqual({
      count: '8 episodes',
      date: 'Nov 13, 2026',
      last: null,
      skipped: null,
    });
  });
});

describe('seasonFactsEstimate', () => {
  const progress = (watched: number, aired = 10, skipped = 0) => ({
    aired,
    skipped,
    total: 10,
    watched,
  });

  it('reads like the facts it stands in for, times as stand-ins', () => {
    expect(seasonFactsEstimate(progress(4), '2024-06-26', true)).toEqual({
      count: '4 of 10 watched',
      date: 'Jun 26, 2024',
      last: { kind: 'clock', text: '0h 00m left' },
      skipped: null,
    });
    expect(seasonFactsEstimate(progress(0), '2024-06-26', true)).toEqual({
      count: '10 episodes',
      date: 'Jun 26, 2024',
      last: { kind: 'clock', text: '0h 00m' },
      skipped: null,
    });
    expect(seasonFactsEstimate(progress(10), '2024-06-26', true).last).toEqual({
      kind: 'eye',
      text: 'Watched',
    });
  });

  it('an airing season: the count of aired episodes and the next day, signed out the episode count', () => {
    expect(
      seasonFactsEstimate(progress(2, 6), '2026-10-02', true),
    ).toMatchObject({ count: '2 of 6 watched', last: { kind: 'pink' } });
    expect(seasonFactsEstimate(progress(0, 6), '2026-10-02', false).count).toBe(
      '10 episodes',
    );
  });

  it('carries the skipped fact, and no time left once nothing is left', () => {
    expect(seasonFactsEstimate(progress(9, 10, 1), '2023-06-22', true)).toEqual(
      {
        count: '9 of 10 watched',
        date: 'Jun 22, 2023',
        last: null,
        skipped: '1 skipped',
      },
    );
  });
});
