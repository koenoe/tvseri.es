import type { UpNextItem } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import {
  airedPercent,
  itemLabel,
  lastWatchedLabel,
  ownerFacts,
  progressLabel,
  watchedPercent,
} from './upNextCopy';

// Thu Nov 12, 2026, 15:00 UTC
const NOW = Date.UTC(2026, 10, 12, 15);

const base: UpNextItem = {
  airDate: '2026-11-07',
  code: 'S02E02',
  episode: 2,
  episodeTitle: 'Fallen',
  isLatest: true,
  lastWatchedAt: NOW - 86_400_000,
  lastWatchedCode: 'S02E01',
  nextSeasonTba: false,
  nextToAir: { airDate: '2026-11-15', episode: 3, season: 2 },
  posterImage: '',
  runtime: 58,
  season: 2,
  seasonFinale: false,
  seasonTotal: 8,
  seasonWatched: 1,
  seriesId: 1,
  slug: 'dexter',
  timeLeftMinutes: 58,
  title: 'Dexter',
  toWatch: 1,
};

/** A season that finished airing long ago, partway through */
const finished: UpNextItem = {
  ...base,
  airDate: '2019-05-10',
  isLatest: false,
  nextToAir: null,
  runtime: 33,
  seasonTotal: 6,
  seasonWatched: 1,
  timeLeftMinutes: 149,
  toWatch: 5,
};

const texts = (item: UpNextItem) => ownerFacts(item, NOW).map((f) => f.text);

describe('progress', () => {
  it('draws watched and aired against the season', () => {
    expect(watchedPercent(base)).toBe(12.5);
    expect(airedPercent(base)).toBe(25);
  });

  it('has no airing stop once the season is out', () => {
    expect(airedPercent({ ...base, nextToAir: null })).toBe(100);
    expect(
      airedPercent({
        ...base,
        nextToAir: { airDate: '2027-01-01', episode: 1, season: 3 },
      }),
    ).toBe(100);
  });

  it('says how far through the season: "1 of 8 watched · 1 to watch"', () => {
    expect(progressLabel(base)).toEqual({
      toWatch: '1 to watch',
      watched: '1 of 8 watched',
    });
  });
});

describe('lastWatchedLabel', () => {
  it('says yesterday and today in words, older days as a date', () => {
    expect(lastWatchedLabel(base, NOW)).toBe('Last watched S02E01 yesterday');
    expect(
      lastWatchedLabel({ ...base, lastWatchedAt: NOW - 3600_000 }, NOW),
    ).toBe('Last watched S02E01 today');
    expect(
      lastWatchedLabel({ ...base, lastWatchedAt: Date.UTC(2026, 9, 26) }, NOW),
    ).toBe('Last watched S02E01 Oct 26');
    expect(
      lastWatchedLabel({ ...base, lastWatchedAt: Date.UTC(2025, 6, 5) }, NOW),
    ).toBe('Last watched S02E01 Jul 5, 2025');
  });

  it('counts UTC days in every zone, so the server and the browser agree', () => {
    const zone = process.env.TZ;
    const now = Date.UTC(2026, 10, 11, 12);
    const at = (hour: number) => ({
      lastWatchedAt: Date.UTC(2026, 10, 10, hour),
      lastWatchedCode: 'S02E01',
    });
    const newYear = {
      ...base,
      nextToAir: { airDate: '2027-01-01', episode: 3, season: 2 },
    };
    try {
      for (const tz of ['UTC', 'Europe/Amsterdam', 'America/Los_Angeles']) {
        process.env.TZ = tz;
        // 23:30 UTC on the 10th is the 11th in Amsterdam, still the 10th in LA
        expect(lastWatchedLabel(at(23.5), now), tz).toBe(
          'Last watched S02E01 yesterday',
        );
        expect(lastWatchedLabel(at(24), now), tz).toBe(
          'Last watched S02E01 today',
        );
        expect(
          ownerFacts(newYear, Date.UTC(2026, 11, 31, 23.5)).at(-1)?.text,
          tz,
        ).toBe('Next Fri Jan 1, 2027');
      }
    } finally {
      process.env.TZ = zone;
    }
  });

  it('is null without a last watched episode', () => {
    expect(
      lastWatchedLabel({ lastWatchedAt: null, lastWatchedCode: null }, NOW),
    ).toBeNull();
    expect(
      lastWatchedLabel({ lastWatchedAt: NOW, lastWatchedCode: null }, NOW),
    ).toBeNull();
  });
});

describe('ownerFacts: the facts line on Home and the profile', () => {
  it('airing: runtime, Latest episode, Next date', () => {
    expect(texts(base)).toEqual(['58m', 'Latest episode', 'Next Sun Nov 15']);
  });

  it('a next date in another year says the year', () => {
    const item = {
      ...base,
      nextToAir: { airDate: '2027-01-08', episode: 3, season: 2 },
    };
    expect(texts(item)).toEqual([
      '58m',
      'Latest episode',
      'Next Fri Jan 8, 2027',
    ]);
  });

  it('a show that finished airing: Aired month, runtime, N left · time', () => {
    expect(texts(finished)).toEqual([
      'Aired May 2019',
      '33m',
      '5 left · 2h 29m',
    ]);
  });

  it('a finished show without a time left: just the count', () => {
    expect(texts({ ...finished, timeLeftMinutes: null })).toEqual([
      'Aired May 2019',
      '33m',
      '5 left',
    ]);
  });

  it('the last episode left: no "1 left" beside its own runtime', () => {
    expect(texts({ ...finished, timeLeftMinutes: 33, toWatch: 1 })).toEqual([
      'Aired May 2019',
      '33m',
    ]);
  });

  it('a finished show with nothing known but the episode', () => {
    expect(
      texts({
        ...finished,
        airDate: undefined,
        runtime: null,
        timeLeftMinutes: null,
      }),
    ).toEqual(['5 left']);
  });

  it('season finale: runtime, Season finale, Next season TBA', () => {
    const item = {
      ...base,
      isLatest: false,
      nextSeasonTba: true,
      nextToAir: null,
      seasonFinale: true,
    };
    expect(texts(item)).toEqual(['58m', 'Season finale', 'Next season TBA']);
  });

  it('a new season announced while the old one is out: Aired, runtime, Next', () => {
    const item = {
      ...finished,
      nextToAir: { airDate: '2026-12-03', episode: 1, season: 3 },
    };
    expect(texts(item)).toEqual([
      'Aired May 2019',
      '33m',
      'Next Thu Dec 3',
      '5 left · 2h 29m',
    ]);
  });

  it('highlights only the latest episode or the finale', () => {
    expect(
      ownerFacts(base, NOW)
        .filter((fact) => fact.highlight)
        .map((fact) => fact.kind),
    ).toEqual(['latest']);
  });
});

describe('itemLabel: the card link’s name', () => {
  it('names the show, the code and the episode', () => {
    expect(itemLabel(base)).toBe('Dexter, S02E02 Fallen');
    expect(itemLabel({ ...base, episodeTitle: undefined })).toBe(
      'Dexter, S02E02',
    );
  });
});
