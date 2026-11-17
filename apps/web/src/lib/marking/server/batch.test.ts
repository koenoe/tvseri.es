import type { Episode } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import {
  chunk,
  pickWatchProvider,
  releaseWatchedAt,
  stampFor,
  toBatchItems,
  toDeleteItems,
} from './batch';

const NOW = Date.UTC(2026, 10, 12, 21, 40);

const episode = (seasonNumber: number, episodeNumber: number): Episode => ({
  airDate: '2024-06-26',
  description: '',
  episodeNumber,
  hasAired: true,
  id: episodeNumber,
  runtime: 35,
  seasonNumber,
  stillImage: '',
  stillPath: '/still.jpg',
  title: `Episode ${episodeNumber}`,
});

const series = {
  id: 136315,
  posterPath: '/p.jpg',
  slug: 'the-bear',
  title: 'The Bear',
};

describe('releaseWatchedAt', () => {
  it('is local noon of the air date', () => {
    // UTC+1 (Amsterdam in winter): getTimezoneOffset() is -60
    expect(
      new Date(releaseWatchedAt('2024-06-26', -60, NOW)).toISOString(),
    ).toBe('2024-06-26T11:00:00.000Z');
    // UTC-5
    expect(
      new Date(releaseWatchedAt('2024-06-26', 300, NOW)).toISOString(),
    ).toBe('2024-06-26T17:00:00.000Z');
  });

  it('falls back to now for a missing, future or pre-2000 date', () => {
    expect(releaseWatchedAt(undefined, 0, NOW)).toBe(NOW);
    expect(releaseWatchedAt('', 0, NOW)).toBe(NOW);
    expect(releaseWatchedAt('2027-01-01', 0, NOW)).toBe(NOW);
    expect(releaseWatchedAt('1999-12-31', 0, NOW)).toBe(NOW);
  });
});

describe('stampFor', () => {
  it('Just now, a picked day, I don’t remember', () => {
    expect(stampFor({ kind: 'now' }, '2024-06-26', NOW)).toEqual({
      watchedAt: NOW,
    });
    expect(
      stampFor({ kind: 'date', watchedAt: 1_700_000_000_000 }, '', NOW),
    ).toEqual({
      watchedAt: 1_700_000_000_000,
    });
    expect(stampFor({ kind: 'unknown' }, '', NOW)).toEqual({
      dateUnknown: true,
      watchedAt: NOW,
    });
  });

  it('On release day: local noon of the episode’s air date', () => {
    expect(
      stampFor({ kind: 'release', tzOffsetMinutes: -60 }, '2024-06-26', NOW),
    ).toEqual({ watchedAt: Date.UTC(2024, 5, 26, 11) });
  });
});

describe('toBatchItems', () => {
  it('builds one API item per known episode, with the provider', () => {
    const items = toBatchItems({
      episodes: [
        { episodeNumber: 5, seasonNumber: 3, when: { kind: 'unknown' } },
        { episodeNumber: 99, seasonNumber: 3, when: { kind: 'now' } },
      ],
      knownProviders: [],
      lookup: (ref) => (ref.episodeNumber === 5 ? episode(3, 5) : undefined),
      now: NOW,
      series,
      userId: 'u1',
      watchProvider: null,
    });
    expect(items).toEqual([
      {
        dateUnknown: true,
        episode: {
          airDate: '2024-06-26',
          episodeNumber: 5,
          runtime: 35,
          seasonNumber: 3,
          stillPath: '/still.jpg',
          title: 'Episode 5',
        },
        tvSeries: series,
        userId: 'u1',
        watchedAt: NOW,
        watchProvider: null,
      },
    ]);
  });

  it('a restore keeps its date, no-date flag, known service and import; a mark gets the viewer’s service', () => {
    const plex = { id: 0, logo: '', logoPath: '/plex.jpg', name: 'Plex' };
    const netflix = { id: 8, logo: '', logoPath: '/n.jpg', name: 'Netflix' };
    const importId = '7f9c2c1e-5b8a-4d3e-9f10-2a6b8c4d5e6f';
    const items = toBatchItems({
      episodes: [
        {
          episodeNumber: 1,
          seasonNumber: 3,
          when: {
            kind: 'restore',
            source: 'Plex',
            watchedAt: 1_700_000_000_000,
          },
        },
        {
          episodeNumber: 2,
          seasonNumber: 3,
          when: {
            dateUnknown: true,
            importId,
            kind: 'restore',
            watchedAt: 1_600_000_000_000,
          },
        },
        {
          episodeNumber: 3,
          seasonNumber: 3,
          when: {
            kind: 'restore',
            source: 'Made up',
            watchedAt: 1_700_000_000_000,
          },
        },
        { episodeNumber: 4, seasonNumber: 3, when: { kind: 'now' } },
      ],
      knownProviders: [plex, netflix],
      lookup: (ref) => episode(3, ref.episodeNumber),
      now: NOW,
      series,
      userId: 'u1',
      watchProvider: netflix,
    });
    expect(
      items.map(({ dateUnknown, importId, watchedAt, watchProvider }) => ({
        dateUnknown,
        importId,
        provider: watchProvider?.name ?? null,
        watchedAt,
      })),
    ).toEqual([
      {
        dateUnknown: undefined,
        importId: undefined,
        provider: 'Plex',
        watchedAt: 1_700_000_000_000,
      },
      {
        dateUnknown: true,
        importId,
        provider: null,
        watchedAt: 1_600_000_000_000,
      },
      {
        dateUnknown: undefined,
        importId: undefined,
        provider: null,
        watchedAt: 1_700_000_000_000,
      },
      {
        dateUnknown: undefined,
        importId: undefined,
        provider: 'Netflix',
        watchedAt: NOW,
      },
    ]);
  });

  it('delete items carry the show and the user', () => {
    expect(
      toDeleteItems({
        episodes: [{ episodeNumber: 1, seasonNumber: 2 }],
        series,
        userId: 'u1',
      }),
    ).toEqual([
      { episodeNumber: 1, seasonNumber: 2, tvSeries: series, userId: 'u1' },
    ]);
  });
});

describe('helpers', () => {
  it('chunks by 50', () => {
    const sizes = chunk(Array.from({ length: 120 }, (_, i) => i)).map(
      (c) => c.length,
    );
    expect(sizes).toEqual([50, 50, 20]);
  });

  it('prefers the user’s services, else the first provider', () => {
    const netflix = { id: 8, logo: '', logoPath: '', name: 'Netflix' };
    const disney = { id: 337, logo: '', logoPath: '', name: 'Disney Plus' };
    expect(pickWatchProvider([netflix, disney], [{ id: 337 }])).toBe(disney);
    expect(pickWatchProvider([netflix, disney], [{ id: 1 }])).toBe(netflix);
    expect(pickWatchProvider([], [{ id: 1 }])).toBeNull();
  });
});
