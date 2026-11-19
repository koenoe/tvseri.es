import { BatchGetItemCommand } from '@aws-sdk/client-dynamodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from './db';
import { fakeShow } from './fixtures/tmdb';
import { request } from './request';
import { OTHER_USER_ID, seedUser, USER_ID } from './seed';

const pad = (value: number) => String(value).padStart(2, '0');

const listItem = (
  userId: string,
  list: string,
  id: number,
  createdAt: number,
) => ({
  createdAt,
  gsi1pk: `LIST#${userId}#${list}`,
  gsi1sk: `show ${id}`,
  gsi2pk: `LIST#${userId}#${list}`,
  gsi2sk: createdAt,
  id,
  pk: `USER#${userId}`,
  posterPath: `/p${id}.jpg`,
  sk: `LIST#${list}#ITEM#${id}`,
  slug: `show-${id}`,
  title: `Show ${id}`,
});

const watched = (
  userId: string,
  seriesId: number,
  episodes: ReadonlyArray<readonly [season: number, episode: number]>,
) =>
  db.seed(
    'Watched',
    episodes.map(([season, episode]) => ({
      episodeNumber: episode,
      gsi1pk: `USER#${userId}#SERIES#${seriesId}`,
      gsi1sk: `S${pad(season)}#E${pad(episode)}`,
      pk: `USER#${userId}`,
      seasonNumber: season,
      seriesId,
      sk: `SERIES#${seriesId}#S${pad(season)}#E${pad(episode)}`,
      userId,
    })),
  );

const skip = (userId: string, seriesId: number, codes: string[]) =>
  db.seed('Lists', [
    {
      pk: `USER#${userId}`,
      seriesId,
      sk: `PREF#SERIES#${seriesId}`,
      skipped: new Set(codes),
    },
  ]);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-12T12:00:00Z'));
});

const setup = () => {
  seedUser();
  seedUser({ id: OTHER_USER_ID });
  // Show 1: three seasons of 4, all aired
  fakeShow({
    id: 1,
    seasons: [
      { airDate: '2020-01-01', episodes: 4 },
      { airDate: '2021-01-01', episodes: 4 },
      { airDate: '2022-01-01', episodes: 4 },
    ],
  });
  // Show 2: one hole
  fakeShow({
    id: 2,
    seasons: [{ airDate: '2020-01-01', episodes: 6 }],
  });
  // Show 3: no holes (the unwatched tail is after the last watched episode)
  fakeShow({
    id: 3,
    seasons: [{ airDate: '2020-01-01', episodes: 6 }],
  });
  // Show 4: the last season has aired 2 of 4; nothing is missing
  fakeShow({
    id: 4,
    seasons: [
      { airDate: '2020-01-01', episodes: 4 },
      { airDate: '2026-10-01', aired: 2, episodes: 4 },
    ],
    status: 'Returning Series',
  });
  fakeShow({
    id: 5,
    seasons: [{ airDate: '2020-01-01', episodes: 4 }],
  });
  db.seed('Lists', [
    listItem(USER_ID, 'IN_PROGRESS', 1, 100),
    listItem(USER_ID, 'IN_PROGRESS', 2, 300),
    listItem(USER_ID, 'IN_PROGRESS', 3, 200),
    listItem(USER_ID, 'IN_PROGRESS', 4, 400),
    // Finished shows have no holes: never scanned
    listItem(USER_ID, 'WATCHED', 5, 500),
  ]);
  watched(USER_ID, 1, [
    [1, 1],
    [1, 2],
    [1, 4],
    [2, 1],
    [2, 2],
    [2, 3],
    [2, 4],
    [3, 1],
    [3, 3],
  ]);
  watched(USER_ID, 2, [
    [1, 1],
    [1, 3],
  ]);
  watched(USER_ID, 3, [
    [1, 1],
    [1, 2],
  ]);
  watched(USER_ID, 4, [
    [1, 1],
    [1, 2],
    [1, 3],
    [1, 4],
    [2, 1],
    [2, 2],
  ]);
  watched(USER_ID, 5, [[1, 1]]);
  watched(OTHER_USER_ID, 3, [
    [1, 1],
    [1, 5],
  ]);
};

describe('season ledger', () => {
  it('lists the shows with holes, most holes first, per season', async () => {
    setup();

    const response = await request('/me/ledger', { as: USER_ID });

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await response.json()).toEqual({
      shows: [
        {
          episodes: ['S01E03', 'S03E02'],
          missingCount: 2,
          posterImage: expect.stringContaining('/poster-1.jpg'),
          seasonCount: 3,
          seasons: [
            { missing: 1, season: 1 },
            { missing: 1, season: 3 },
          ],
          seriesId: 1,
          slug: 'show-1',
          title: 'Show 1',
        },
        {
          episodes: ['S01E02'],
          missingCount: 1,
          posterImage: expect.stringContaining('/poster-2.jpg'),
          seasonCount: 1,
          seasons: [{ missing: 1, season: 1 }],
          seriesId: 2,
          slug: 'show-2',
          title: 'Show 2',
        },
      ],
    });
  });

  it('reads every show’s summary in one batch read, not one per show', async () => {
    setup();
    db.calls.length = 0;

    await request('/me/ledger', { as: USER_ID });

    const summaryReads = db.calls.filter(
      (command) =>
        command instanceof BatchGetItemCommand &&
        JSON.stringify(command.input).includes('AGG#'),
    );
    expect(summaryReads).toHaveLength(1);
  });

  it('finds holes by the real episode numbers where TMDB numbers on across seasons', async () => {
    seedUser();
    // Naruto Shippuden: S1 = E1…E4, S2 = E5…E8, S3 = E9…E12
    fakeShow({
      id: 31910,
      numberedOn: true,
      seasons: [
        { airDate: '2020-01-01', episodes: 4 },
        { airDate: '2021-01-01', episodes: 4 },
        { airDate: '2022-01-01', episodes: 4 },
      ],
    });
    db.seed('Lists', [listItem(USER_ID, 'IN_PROGRESS', 31910, 100)]);
    watched(USER_ID, 31910, [
      [1, 1],
      [1, 2],
      [1, 3],
      [1, 4],
      [2, 5],
      [2, 7],
      [2, 8],
      [3, 9],
      [3, 11],
    ]);

    const response = await request('/me/ledger', { as: USER_ID });
    expect(await response.json()).toMatchObject({
      shows: [{ episodes: ['S02E06', 'S03E10'], seriesId: 31910 }],
    });
  });

  it('closes a hole with a skip', async () => {
    setup();
    skip(USER_ID, 1, ['S01E03']);

    const response = await request('/me/ledger', { as: USER_ID });
    const { shows } = (await response.json()) as {
      shows: Array<{ seriesId: number; episodes: string[] }>;
    };

    expect(shows[0]).toMatchObject({ episodes: ['S03E02'], seriesId: 1 });
  });

  it('is empty when no show has a hole', async () => {
    seedUser();

    const response = await request('/me/ledger', { as: USER_ID });

    expect(await response.json()).toEqual({ shows: [] });
  });

  it('names the missing episodes of one show with their air dates', async () => {
    setup();

    const response = await request('/me/ledger/1', { as: USER_ID });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      episodes: [
        {
          airDate: '2020-01-15',
          code: 'S01E03',
          episode: 3,
          season: 1,
          title: 'Episode 3',
        },
        {
          airDate: '2022-01-08',
          code: 'S03E02',
          episode: 2,
          season: 3,
          title: 'Episode 2',
        },
      ],
      seriesId: 1,
    });
  });

  it('needs a signed-in viewer', async () => {
    expect((await request('/me/ledger')).status).toBe(401);
    expect((await request('/me/ledger/1')).status).toBe(401);
  });

  it('rejects a bad id', async () => {
    seedUser();

    expect((await request('/me/ledger/abc', { as: USER_ID })).status).toBe(400);
  });
});
