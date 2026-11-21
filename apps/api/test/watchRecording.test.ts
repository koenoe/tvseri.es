import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import type { SQSEvent } from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';

import { handler as scrobbleHandler } from '@/lambdas/scrobble';
import { db } from './db';
import { onTmdb } from './fakeHttp';
import { fakeShow } from './fixtures/tmdb';
import { lambdaContext } from './lambdaContext';
import { seedWatched } from './library';
import { request } from './request';
import { seedUser, USER_ID } from './seed';
import { listItems } from './stream';

/**
 * How every way of recording or erasing watches behaves: the rows written or
 * deleted, the prefs change (skips, Hide) and whether the show's lists are
 * placed inside the request. Pinned through the routes and the scrobble
 * Lambda, so the code behind them can move without changing any of it.
 */

// Module caches keep TMDB series between tests: one show id per test
let nextShow = 7700;

const WATCHED_AT = Date.UTC(2025, 2, 1);
const NETFLIX = { id: 8, logo: '', logoPath: '/n.jpg', name: 'Netflix' };
const SYNC_TAG = 'netflix-sync:0b9c1f9e-2f4b-4c3a-9a51-3f6f5d0c7e21';

/**
 * Season 1: three aired episodes. Season 2: two of three aired. Season 3:
 * not started. One aired special.
 */
const newShow = () => {
  nextShow += 1;
  fakeShow({
    id: nextShow,
    seasons: [
      { airDate: '2020-01-01', episodes: 3 },
      { airDate: '2021-01-01', aired: 2, episodes: 3 },
      { airDate: '2099-01-01', aired: 0, episodes: 2 },
    ],
    specials: { airDate: '2020-12-25', episodes: 1 },
  });
  return nextShow;
};

const setup = () => {
  seedUser();
  return newShow();
};

const pad = (value: number) => String(value).padStart(3, '0');

/** The stored row the API writes for one episode, every attribute */
const storedRow = (
  show: number,
  season: number,
  episode: number,
  extra: Readonly<Record<string, unknown>> = {},
) => ({
  episodeAirDate: '2020-01-01',
  episodeNumber: episode,
  episodeStillPath: null,
  episodeTitle: `Episode ${episode}`,
  gsi1pk: `USER#${USER_ID}#SERIES#${show}`,
  gsi1sk: `S${pad(season)}#E${pad(episode)}`,
  gsi2pk: `USER#${USER_ID}#WATCHED`,
  gsi2sk: WATCHED_AT,
  pk: `USER#${USER_ID}`,
  posterPath: '/p.jpg',
  runtime: 30,
  seasonNumber: season,
  seriesId: show,
  sk: `SERIES#${show}#S${pad(season)}#E${pad(episode)}`,
  slug: 'show',
  title: 'Show',
  userId: USER_ID,
  watchedAt: WATCHED_AT,
  watchProviderLogoPath: null,
  watchProviderName: null,
  ...extra,
});

/** A row as the web sends it to `POST /watched/batch` */
const batchRow = (
  show: number,
  season: number,
  episode: number,
  extra: Readonly<Record<string, unknown>> = {},
) => ({
  episode: {
    airDate: '2020-01-01',
    episodeNumber: episode,
    runtime: 30,
    seasonNumber: season,
    stillPath: null,
    title: `Episode ${episode}`,
  },
  tvSeries: { id: show, posterPath: '/p.jpg', slug: 'show', title: 'Show' },
  userId: USER_ID,
  watchedAt: WATCHED_AT,
  ...extra,
});

const watchedRows = () =>
  db.dump('Watched').sort((a, b) => String(a.sk).localeCompare(String(b.sk)));

const codesOf = (rows: ReadonlyArray<Record<string, unknown>>) =>
  rows.map(
    (row) =>
      `S${String(row.seasonNumber).padStart(2, '0')}E${String(row.episodeNumber).padStart(2, '0')}`,
  );

const lists = () =>
  listItems(USER_ID)
    .map((item) => String(item.sk))
    .filter((sk) => sk.startsWith('LIST#'));

const patchPrefs = async (show: number, body: unknown) => {
  const response = await request(`/me/series/${show}/prefs`, {
    as: USER_ID,
    body,
    method: 'PATCH',
  });
  expect(response.status).toBe(200);
};

const prefsOf = async (show: number) => {
  const response = await request(`/me/series/${show}/prefs`, { as: USER_ID });
  return (await response.json()) as { paused: string | null; skipped: [] };
};

/** Hidden, with skips: what a mark may change */
const hideAndSkip = (show: number, skip: ReadonlyArray<string>) =>
  patchPrefs(show, { paused: 'hide', skip });

const post = (path: string, body: unknown) =>
  request(`/user/${USER_ID}${path}`, { as: USER_ID, body, method: 'POST' });

const del = (path: string) =>
  request(`/user/${USER_ID}${path}`, { as: USER_ID, method: 'DELETE' });

describe('a viewer marks episodes (POST /watched/batch)', () => {
  it('writes one row per episode (a repeat in the batch once) and answers them', async () => {
    const show = setup();

    const response = await post('/watched/batch', [
      batchRow(show, 1, 1, { watchProvider: NETFLIX }),
      batchRow(show, 1, 1, { watchProvider: NETFLIX }),
      batchRow(show, 1, 2, { dateUnknown: true }),
    ]);

    expect(response.status).toBe(201);
    const netflix = {
      watchProviderLogoPath: '/n.jpg',
      watchProviderName: 'Netflix',
    };
    const {
      gsi2pk: _pk,
      gsi2sk: _sk,
      ...undated
    } = storedRow(show, 1, 2, {
      dateUnknown: true,
    });
    expect(watchedRows()).toEqual([storedRow(show, 1, 1, netflix), undated]);
    const keys = ['gsi1pk', 'gsi1sk', 'gsi2pk', 'gsi2sk', 'pk', 'sk'];
    const withoutKeys = (row: Record<string, unknown>) =>
      Object.fromEntries(
        Object.entries(row).filter(([key]) => !keys.includes(key)),
      );
    expect(await response.json()).toEqual([
      withoutKeys(storedRow(show, 1, 1, netflix)),
      withoutKeys(undated),
    ]);
  });

  it('un-skips the episodes, brings a hidden show back and places it in the request', async () => {
    const show = setup();
    await hideAndSkip(show, ['S01E01', 'S01E02']);

    expect((await post('/watched/batch', [batchRow(show, 1, 1)])).status).toBe(
      201,
    );

    expect(await prefsOf(show)).toMatchObject({
      paused: null,
      skipped: ['S01E02'],
    });
    expect(lists()).toEqual([`LIST#IN_PROGRESS#ITEM#${show}`]);
  });

  it('a special alone un-skips it and leaves the show hidden', async () => {
    const show = setup();
    await hideAndSkip(show, ['S00E01']);

    await post('/watched/batch', [batchRow(show, 0, 1)]);

    expect(await prefsOf(show)).toMatchObject({ paused: 'hide', skipped: [] });
  });

  it('keeps a sync tag, drops the id of an import that is not open', async () => {
    const show = setup();

    await post('/watched/batch', [
      batchRow(show, 1, 1, { importId: SYNC_TAG }),
      batchRow(show, 1, 2, {
        importId: '6f0b2c1e-9d4a-4b7e-8c3f-1a2b3c4d5e6f',
      }),
    ]);

    expect(watchedRows().map((row) => row.importId)).toEqual([
      SYNC_TAG,
      undefined,
    ]);
  });

  it('writes episodes TMDB does not list, from the request alone', async () => {
    const show = setup();

    await post('/watched/batch', [batchRow(show, 1, 99)]);

    expect(watchedRows()).toEqual([storedRow(show, 1, 99)]);
  });
});

describe('Undo puts marks back (POST /watched/batch?restore=true)', () => {
  it('writes the rows, un-skips them, leaves Hide and places the show in the request', async () => {
    const show = setup();
    await hideAndSkip(show, ['S01E01', 'S01E02']);

    const response = await post('/watched/batch?restore=true', [
      batchRow(show, 1, 1),
    ]);

    expect(response.status).toBe(201);
    expect(watchedRows()).toEqual([storedRow(show, 1, 1)]);
    expect(await prefsOf(show)).toMatchObject({
      paused: 'hide',
      skipped: ['S01E02'],
    });
    expect(lists()).toEqual([`LIST#IN_PROGRESS#ITEM#${show}`]);
  });
});

describe('a viewer marks a season', () => {
  const markSeason = (show: number, season: number, body: unknown = {}) =>
    post(`/watched/series/${show}/season/${season}`, {
      watchedAt: WATCHED_AT,
      watchProvider: null,
      ...(body as object),
    });

  it('writes its aired episodes that are neither watched nor skipped, and answers them with the watched ones', async () => {
    const show = setup();
    seedWatched(USER_ID, show, [[1, 1]], '2024-06-01T00:00:00Z');
    await hideAndSkip(show, ['S01E03']);

    const response = await markSeason(show, 1, { watchProvider: NETFLIX });

    expect(response.status).toBe(201);
    const existing = watchedRows()[0]!;
    expect(existing.watchedAt).toBe(Date.parse('2024-06-01T00:00:00Z'));
    const written = {
      episodeAirDate: '2020-01-08T00:00:00.000Z',
      episodeNumber: 2,
      episodeStillPath: '/still-1-2.jpg',
      episodeTitle: 'Episode 2',
      posterPath: `/poster-${show}.jpg`,
      runtime: 30,
      seasonNumber: 1,
      seriesId: show,
      slug: `show-${show}`,
      title: `Show ${show}`,
      userId: USER_ID,
      watchedAt: WATCHED_AT,
      watchProviderLogoPath: '/n.jpg',
      watchProviderName: 'Netflix',
    };
    expect(codesOf(watchedRows())).toEqual(['S01E01', 'S01E02']);
    expect(watchedRows()[1]).toEqual({
      ...written,
      gsi1pk: `USER#${USER_ID}#SERIES#${show}`,
      gsi1sk: 'S001#E002',
      gsi2pk: `USER#${USER_ID}#WATCHED`,
      gsi2sk: WATCHED_AT,
      pk: `USER#${USER_ID}`,
      sk: `SERIES#${show}#S001#E002`,
    });
    // The watched one as read (keys dropped, image URLs), the new one as written
    expect(await response.json()).toEqual(
      [
        {
          episodeNumber: 1,
          episodeStillImage: undefined,
          posterImage: undefined,
          seasonNumber: 1,
          seriesId: show,
          userId: USER_ID,
          watchedAt: Date.parse('2024-06-01T00:00:00Z'),
          watchProviderLogoImage: undefined,
        },
        written,
      ].map((item) => JSON.parse(JSON.stringify(item))),
    );
    // A skip stays a skip; the show is back from Hide and placed
    expect(await prefsOf(show)).toMatchObject({
      paused: null,
      skipped: ['S01E03'],
    });
    expect(lists()).toEqual([`LIST#IN_PROGRESS#ITEM#${show}`]);
  });

  it('writes only the episodes that have aired', async () => {
    const show = setup();

    await markSeason(show, 2);

    expect(codesOf(watchedRows())).toEqual(['S02E01', 'S02E02']);
  });

  it('a season watched already writes nothing, and still brings the show back from Hide and places it', async () => {
    const show = setup();
    seedWatched(USER_ID, show, [
      [1, 1],
      [1, 2],
      [1, 3],
    ]);
    const before = watchedRows();
    await patchPrefs(show, { paused: 'hide' });

    const response = await markSeason(show, 1);

    expect(response.status).toBe(201);
    expect(watchedRows()).toEqual(before);
    expect(await prefsOf(show)).toMatchObject({ paused: null });
    expect(lists()).toEqual([`LIST#IN_PROGRESS#ITEM#${show}`]);
  });

  it('is a 400 for a season that has not started, a 404 for a show TMDB does not have', async () => {
    const show = setup();

    const unaired = await markSeason(show, 3);
    expect(unaired.status).toBe(400);
    expect(await unaired.json()).toEqual({
      message: `Invalid season for ${show}`,
      status: 400,
    });

    onTmdb('/tv/7699', { status_message: 'nope' }, { status: 404 });
    expect((await markSeason(7699, 1)).status).toBe(404);
    expect(watchedRows()).toEqual([]);
    expect(lists()).toEqual([]);
  });
});

describe('a viewer marks a whole show', () => {
  const markShow = (show: number) =>
    post(`/watched/series/${show}`, {
      watchedAt: WATCHED_AT,
      watchProvider: null,
    });

  it('writes every aired regular episode not watched or skipped, specials left', async () => {
    const show = setup();
    await hideAndSkip(show, ['S02E01']);

    const response = await markShow(show);

    expect(response.status).toBe(201);
    expect(codesOf(watchedRows())).toEqual([
      'S01E01',
      'S01E02',
      'S01E03',
      'S02E02',
    ]);
    expect(codesOf(await response.json())).toEqual([
      'S01E01',
      'S01E02',
      'S01E03',
      'S02E02',
    ]);
    expect(await prefsOf(show)).toMatchObject({
      paused: null,
      skipped: ['S02E01'],
    });
    expect(lists()).toEqual([`LIST#IN_PROGRESS#ITEM#${show}`]);
  });

  it('is a 413 above the episode cap, before anything is written', async () => {
    seedUser();
    nextShow += 1;
    const show = nextShow;
    fakeShow({
      id: show,
      seasons: [
        { airDate: '1990-01-01', episodes: 600 },
        { airDate: '2002-01-01', episodes: 401 },
      ],
    });

    const response = await markShow(show);

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({
      message:
        'Too many episodes to mark at once (1001); mark seasons one by one',
      status: 413,
    });
    expect(watchedRows()).toEqual([]);
  });
});

describe('a viewer unmarks', () => {
  const seedShow = (show: number) =>
    seedWatched(USER_ID, show, [
      [0, 1],
      [1, 1],
      [1, 2],
      [2, 1],
    ]);

  it('episodes (POST /watched/batch/delete): deletes them, prefs untouched, placed in the request', async () => {
    const show = setup();
    seedShow(show);
    await hideAndSkip(show, ['S01E03']);
    db.seed('Lists', [
      {
        createdAt: 1,
        id: show,
        pk: `USER#${USER_ID}`,
        sk: `LIST#IN_PROGRESS#ITEM#${show}`,
      },
    ]);
    const row = (season: number, episode: number) => ({
      episodeNumber: episode,
      seasonNumber: season,
      tvSeries: batchRow(show, season, episode).tvSeries,
      userId: USER_ID,
    });

    const response = await post('/watched/batch/delete', [
      row(1, 1),
      row(1, 1),
      row(1, 2),
      row(2, 1),
    ]);

    expect(response.status).toBe(201);
    expect(codesOf(watchedRows())).toEqual(['S00E01']);
    expect(await prefsOf(show)).toMatchObject({
      paused: 'hide',
      skipped: ['S01E03'],
    });
    // Nothing regular watched: out of In progress
    expect(lists()).toEqual([]);
  });

  it('a season: deletes that season only, prefs untouched, placed in the request', async () => {
    const show = setup();
    seedShow(show);
    await hideAndSkip(show, ['S01E03']);

    expect((await del(`/watched/series/${show}/season/1`)).status).toBe(200);

    expect(codesOf(watchedRows())).toEqual(['S00E01', 'S02E01']);
    expect(await prefsOf(show)).toMatchObject({
      paused: 'hide',
      skipped: ['S01E03'],
    });
    expect(lists()).toEqual([`LIST#IN_PROGRESS#ITEM#${show}`]);
  });

  it('a whole show: deletes the regular episodes, keeps specials, placed in the request', async () => {
    const show = setup();
    seedShow(show);
    db.seed('Lists', [
      {
        createdAt: 1,
        id: show,
        pk: `USER#${USER_ID}`,
        sk: `LIST#IN_PROGRESS#ITEM#${show}`,
      },
    ]);

    expect((await del(`/watched/series/${show}`)).status).toBe(200);

    expect(codesOf(watchedRows())).toEqual(['S00E01']);
    expect(lists()).toEqual([]);
  });
});

describe('an import writes a batch (POST /me/imports/:id/batch)', () => {
  it('writes the rows with the import id, un-skips them (kept for Undo), leaves Hide, places no list', async () => {
    const show = setup();
    await hideAndSkip(show, ['S01E01', 'S01E03']);
    const started = await request('/me/imports', {
      as: USER_ID,
      method: 'POST',
    });
    const { importId } = (await started.json()) as { importId: string };

    const response = await request(`/me/imports/${importId}/batch`, {
      as: USER_ID,
      body: [batchRow(show, 1, 1), batchRow(show, 1, 2)].map(
        ({ userId: _, ...row }) => row,
      ),
      method: 'POST',
    });

    expect(response.status).toBe(201);
    expect(watchedRows()).toEqual([
      storedRow(show, 1, 1, { importId }),
      storedRow(show, 1, 2, { importId }),
    ]);
    expect(await prefsOf(show)).toMatchObject({
      paused: 'hide',
      skipped: ['S01E03'],
    });
    const user = db.dump('Users').find((item) => item.id === USER_ID);
    expect(user?.importUnskipped).toEqual({
      codes: { [show]: new Set(['S01E01']) },
      importId,
    });
    // The stream places it; the request doesn't
    expect(lists()).toEqual([]);
  });
});

describe('a picked sync entry (POST /me/connections/:service/unresolved/resolve)', () => {
  it('writes it as the service under a sync tag, un-skips it, leaves Hide, places no list', async () => {
    const show = setup();
    await hideAndSkip(show, ['S01E01']);

    const response = await request(
      '/me/connections/netflix/unresolved/resolve',
      {
        as: USER_ID,
        body: {
          items: [batchRow(show, 1, 1)].map(({ userId: _, ...row }) => row),
          keys: ['1'],
        },
        method: 'POST',
      },
    );

    expect(response.status).toBe(200);
    const [row] = watchedRows();
    expect(row).toEqual(
      storedRow(show, 1, 1, {
        importId: expect.stringMatching(/^netflix-sync:/),
        watchProviderLogoPath: row?.watchProviderLogoPath,
        watchProviderName: 'Netflix',
      }),
    );
    expect(await prefsOf(show)).toMatchObject({ paused: 'hide', skipped: [] });
    expect(lists()).toEqual([]);
  });
});

describe('a Plex scrobble (the scrobble Lambda)', () => {
  const scrobble = (show: number, sentAt: number) => {
    onTmdb('/find/tt0007701', {
      tv_episode_results: [
        {
          air_date: '2020-01-08',
          episode_number: 2,
          id: 1,
          name: 'Episode 2',
          runtime: 30,
          season_number: 1,
          show_id: show,
          still_path: null,
        },
      ],
    });
    return scrobbleHandler(
      {
        Records: [
          {
            attributes: { SentTimestamp: String(sentAt) },
            body: JSON.stringify({
              metadata: { plex: { Guid: [{ id: 'imdb://tt0007701' }] } },
              userId: USER_ID,
            }),
            messageId: 'm1',
          },
        ],
      } as unknown as SQSEvent,
      lambdaContext(),
    );
  };

  it('writes the episode as Plex at the time it was queued, un-skips it, unhides, places no list', async () => {
    const show = setup();
    await hideAndSkip(show, ['S01E02', 'S01E03']);

    expect(await scrobble(show, WATCHED_AT)).toEqual({ batchItemFailures: [] });
    // A redelivery writes the same row again
    expect(await scrobble(show, WATCHED_AT)).toEqual({ batchItemFailures: [] });

    expect(watchedRows()).toEqual([
      {
        episodeAirDate: '2020-01-08T00:00:00.000Z',
        episodeNumber: 2,
        episodeStillPath: '',
        episodeTitle: 'Episode 2',
        gsi1pk: `USER#${USER_ID}#SERIES#${show}`,
        gsi1sk: 'S001#E002',
        gsi2pk: `USER#${USER_ID}#WATCHED`,
        gsi2sk: WATCHED_AT,
        pk: `USER#${USER_ID}`,
        posterPath: `/poster-${show}.jpg`,
        runtime: 30,
        seasonNumber: 1,
        seriesId: show,
        sk: `SERIES#${show}#S001#E002`,
        slug: `show-${show}`,
        title: `Show ${show}`,
        userId: USER_ID,
        watchedAt: WATCHED_AT,
        watchProviderLogoPath: expect.any(String),
        watchProviderName: 'Plex',
      },
    ]);
    expect(await prefsOf(show)).toMatchObject({
      paused: null,
      skipped: ['S01E03'],
    });
    expect(lists()).toEqual([]);
  });
});

describe('errors from the data layer answer as before', () => {
  it('a malformed cursor is a 400', async () => {
    seedUser();
    const response = await request(`/user/${USER_ID}/watched?cursor=%%%`, {
      as: USER_ID,
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      message: 'Invalid cursor',
      status: 400,
    });
  });

  it('a profile update that loses a race is a 409 that says why', async () => {
    seedUser();
    const send = db.send.bind(db);
    vi.spyOn(db, 'send').mockImplementation(((
      command: Readonly<{ constructor: { name: string } }>,
    ) =>
      command.constructor.name === 'UpdateItemCommand'
        ? Promise.reject(
            new ConditionalCheckFailedException({
              $metadata: {},
              message: 'The conditional request failed',
            }),
          )
        : send(command as never)) as never);

    const response = await request('/me', {
      as: USER_ID,
      body: { name: 'Wren' },
      method: 'PUT',
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      message:
        "Looks like you're updating your profile on another device. Please try again.",
      status: 409,
    });
  });
});
