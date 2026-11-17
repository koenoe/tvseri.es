import type { SQSEvent } from 'aws-lambda';
import { describe, expect, it } from 'vitest';

import { handler as scrobbleHandler } from '@/lambdas/scrobble';
import { db } from './db';
import { onTmdb } from './fakeHttp';
import { fakeShow } from './fixtures/tmdb';
import { lambdaContext } from './lambdaContext';
import { listItem, seedWatched } from './library';
import { request } from './request';
import { seedUser, USER_ID } from './seed';

const SHOW = 1396;

const setup = () => {
  seedUser();
  fakeShow({
    id: SHOW,
    seasons: [
      { airDate: '2020-01-01', episodes: 3 },
      { airDate: '2021-01-01', episodes: 3 },
    ],
  });
};

const patch = (body: unknown) =>
  request(`/me/series/${SHOW}/prefs`, { as: USER_ID, body, method: 'PATCH' });

const prefs = async () => {
  const response = await request(`/me/series/${SHOW}/prefs`, { as: USER_ID });
  expect(response.status).toBe(200);
  return response.json();
};

const EMPTY = {
  firstTrackingAnsweredAt: null,
  neverAskBefore: false,
  paused: null,
  pausedAt: null,
  skipped: [],
};

describe('per-show prefs', () => {
  it('needs a signed-in user', async () => {
    setup();
    const response = await request(`/me/series/${SHOW}/prefs`);
    expect(response.status).toBe(401);
  });

  it('starts empty', async () => {
    setup();
    expect(await prefs()).toEqual(EMPTY);
  });

  it('skips and unskips episodes, in canonical codes', async () => {
    setup();
    const skipped = await patch({ skip: ['S2E6', 'S02E05'] });
    expect(skipped.status).toBe(200);
    expect(await skipped.json()).toMatchObject({
      skipped: ['S02E05', 'S02E06'],
    });
    expect(await prefs()).toMatchObject({ skipped: ['S02E05', 'S02E06'] });

    await patch({ unskip: ['S02E05'] });
    expect(await prefs()).toMatchObject({ skipped: ['S02E06'] });
  });

  it('records the first-tracking answer, "never ask before" and Paused', async () => {
    setup();
    const before = Date.now();
    await patch({
      firstTrackingAnswered: true,
      neverAskBefore: true,
      paused: 'keep',
    });
    const result = await prefs();
    expect(result.firstTrackingAnsweredAt).toBeGreaterThanOrEqual(before);
    expect(result.neverAskBefore).toBe(true);
    expect(result.paused).toBe('keep');
    expect(result.pausedAt).toBeGreaterThanOrEqual(before);

    await patch({ neverAskBefore: false, paused: null });
    expect(await prefs()).toMatchObject({
      neverAskBefore: false,
      paused: null,
      pausedAt: null,
    });
  });

  it('rejects bad input', async () => {
    setup();
    expect((await patch({ skip: ['E5'] })).status).toBe(400);
    expect((await patch({})).status).toBe(400);
    expect((await patch({ paused: 'later' })).status).toBe(400);
    expect((await patch({ skip: ['S01E01'], unskip: ['S1E1'] })).status).toBe(
      400,
    );
  });

  it('marking a skipped episode watched clears the skip', async () => {
    setup();
    await patch({ skip: ['S01E02', 'S01E03', 'S02E01'] });
    await request(
      `/user/${USER_ID}/watched/series/${SHOW}/season/1/episode/2`,
      {
        as: USER_ID,
        body: { watchProvider: null },
        method: 'POST',
      },
    );
    expect(await prefs()).toMatchObject({ skipped: ['S01E03', 'S02E01'] });

    await request(`/user/${USER_ID}/watched/series/${SHOW}/season/1`, {
      as: USER_ID,
      body: { watchProvider: null },
      method: 'POST',
    });
    expect(await prefs()).toMatchObject({ skipped: ['S02E01'] });

    await request(`/user/${USER_ID}/watched/batch`, {
      as: USER_ID,
      body: [
        {
          episode: {
            airDate: '2021-01-01T00:00:00.000Z',
            episodeNumber: 1,
            runtime: 30,
            seasonNumber: 2,
            stillPath: null,
            title: 'Episode 1',
          },
          tvSeries: {
            id: SHOW,
            posterPath: '/p.jpg',
            slug: 'show',
            title: 'Show',
          },
          userId: USER_ID,
          watchedAt: Date.UTC(2024, 0, 1),
        },
      ],
      method: 'POST',
    });
    expect(await prefs()).toMatchObject({ skipped: [] });
  });

  it('a Plex scrobble of a skipped episode clears the skip', async () => {
    setup();
    await patch({ skip: ['S01E02', 'S01E03'] });
    onTmdb('/find/tt0000102', {
      tv_episode_results: [
        {
          air_date: '2020-01-08',
          episode_number: 2,
          id: 1,
          name: 'Episode 2',
          runtime: 30,
          season_number: 1,
          show_id: SHOW,
          still_path: null,
        },
      ],
    });
    const event = {
      Records: [
        {
          attributes: { SentTimestamp: String(Date.UTC(2024, 0, 1)) },
          body: JSON.stringify({
            metadata: { plex: { Guid: [{ id: 'imdb://tt0000102' }] } },
            userId: USER_ID,
          }),
          messageId: 'm1',
        },
      ],
    } as unknown as SQSEvent;
    expect(await scrobbleHandler(event, lambdaContext())).toEqual({
      batchItemFailures: [],
    });
    expect(await prefs()).toMatchObject({ skipped: ['S01E03'] });
  });

  it('a season mark answers in the track view with its service', async () => {
    setup();
    const response = await request(
      `/user/${USER_ID}/watched/series/${SHOW}/season/1?view=track`,
      {
        as: USER_ID,
        body: {
          watchProvider: {
            id: 8,
            logo: '',
            logoPath: '/n.jpg',
            name: 'Netflix',
          },
        },
        method: 'POST',
      },
    );
    expect(response.status).toBe(201);
    const items = (await response.json()) as Array<Record<string, unknown>>;
    expect(items).toHaveLength(3);
    expect(Object.keys(items[0]!).sort()).toEqual([
      'episodeNumber',
      'runtime',
      'seasonNumber',
      'watchProviderLogoPath',
      'watchProviderName',
      'watchedAt',
    ]);
    expect(items[0]).toMatchObject({ watchProviderName: 'Netflix' });
  });

  it('marking the whole show clears every skip', async () => {
    setup();
    await patch({ skip: ['S01E02', 'S02E03'] });
    await request(`/user/${USER_ID}/watched/series/${SHOW}`, {
      as: USER_ID,
      body: { watchProvider: null },
      method: 'POST',
    });
    expect(await prefs()).toMatchObject({ skipped: [] });
  });

  it('returns list status and prefs in one call', async () => {
    setup();
    await request(`/user/${USER_ID}/list/favorites`, {
      as: USER_ID,
      body: {
        id: SHOW,
        posterPath: '/p.jpg',
        slug: 'show',
        status: 'Ended',
        title: 'Show',
      },
      method: 'POST',
    });
    await patch({ skip: ['S01E01'] });
    const response = await request(`/me/series/${SHOW}/status`, {
      as: USER_ID,
    });
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await response.json()).toEqual({
      isFavorited: true,
      isWatchlisted: false,
      prefs: { ...EMPTY, skipped: ['S01E01'] },
    });
  });

  it('never shows up in list reads', async () => {
    setup();
    await patch({ paused: 'hide', skip: ['S01E01'] });
    for (const list of ['favorites', 'in_progress', 'watched', 'watchlist']) {
      const items = await request(`/user/${USER_ID}/list/${list}`, {
        as: USER_ID,
      });
      expect(await items.json()).toEqual({ items: [], nextCursor: null });
      const count = await request(`/user/${USER_ID}/list/${list}/count`, {
        as: USER_ID,
      });
      expect(await count.json()).toEqual({ count: 0 });
    }
  });

  it('Hide and Unhide: only the prefs item changes, the Library follows', async () => {
    setup();
    db.seed('Lists', [
      listItem(USER_ID, 'IN_PROGRESS', SHOW, 500),
      listItem(USER_ID, 'FAVORITES', SHOW, 400),
    ]);
    // In progress as the lists have it: a skip places the show by its
    // watched episodes
    seedWatched(USER_ID, SHOW, [[1, 1]]);
    await patch({ skip: ['S01E02'] });
    const listsBefore = db
      .dump('Lists')
      .filter((item) => String(item.sk).startsWith('LIST#'));

    const hidden = (await (await patch({ paused: 'hide' })).json()) as {
      paused: string;
      pausedAt: number;
      skipped: string[];
    };
    expect(hidden.paused).toBe('hide');
    expect(hidden.skipped).toEqual(['S01E02']);
    const library = async (shelf: string) =>
      (
        (await (
          await request(`/user/${USER_ID}/library/${shelf}`, { as: USER_ID })
        ).json()) as { items: Array<{ id: number; hiddenAt: number | null }> }
      ).items;
    expect(await library('watching')).toEqual([]);
    expect(await library('hidden')).toEqual([
      expect.objectContaining({ hiddenAt: hidden.pausedAt, id: SHOW }),
    ]);

    // Unhide removes `paused` and `pausedAt`, keeps the skips
    expect(await (await patch({ paused: null })).json()).toEqual({
      ...EMPTY,
      skipped: ['S01E02'],
    });
    expect((await library('watching')).map((item) => item.id)).toEqual([SHOW]);
    expect(await library('hidden')).toEqual([]);

    // the list items were never touched
    expect(
      db.dump('Lists').filter((item) => String(item.sk).startsWith('LIST#')),
    ).toEqual(listsBefore);
  });
});

describe('a mark brings a hidden show back', () => {
  const batchRow = (season: number, episode: number) => ({
    episode: {
      airDate: '2020-01-01T00:00:00.000Z',
      episodeNumber: episode,
      runtime: 30,
      seasonNumber: season,
      stillPath: null,
      title: `Episode ${episode}`,
    },
    tvSeries: { id: SHOW, posterPath: '/p.jpg', slug: 'show', title: 'Show' },
    userId: USER_ID,
    watchedAt: Date.UTC(2024, 0, 1),
  });
  const post = (path: string, body: unknown) =>
    request(`/user/${USER_ID}${path}`, { as: USER_ID, body, method: 'POST' });

  it('an episode, season, whole-show or batch mark unhides it', async () => {
    setup();
    const marks = [
      () =>
        post(`/watched/series/${SHOW}/season/1/episode/1`, {
          watchProvider: null,
        }),
      () => post(`/watched/series/${SHOW}/season/1`, { watchProvider: null }),
      () => post(`/watched/series/${SHOW}`, { watchProvider: null }),
      () => post('/watched/batch', [batchRow(2, 1)]),
    ];
    for (const mark of marks) {
      await patch({ paused: 'hide', skip: ['S02E03'] });
      expect((await mark()).status).toBe(201);
      expect(await prefs()).toMatchObject({ paused: null, pausedAt: null });
    }
  });

  it('Undo putting marks back leaves it hidden', async () => {
    setup();
    await patch({ paused: 'hide' });
    const response = await post('/watched/batch?restore=true', [
      batchRow(1, 1),
    ]);
    expect(response.status).toBe(201);
    expect(await prefs()).toMatchObject({ paused: 'hide' });
  });

  it('a special, an unmark or a Keep answer change nothing', async () => {
    setup();
    await patch({ paused: 'hide' });
    await post('/watched/batch', [batchRow(0, 1)]);
    await request(`/user/${USER_ID}/watched/series/${SHOW}/season/1`, {
      as: USER_ID,
      method: 'DELETE',
    });
    expect(await prefs()).toMatchObject({ paused: 'hide' });

    await patch({ paused: 'keep' });
    await post('/watched/batch', [batchRow(1, 2)]);
    expect(await prefs()).toMatchObject({ paused: 'keep' });
  });

  it('a show without prefs gets no prefs record', async () => {
    setup();
    await post('/watched/batch', [batchRow(1, 1)]);
    expect(
      db.dump('Lists').filter((item) => String(item.sk).startsWith('PREF#')),
    ).toEqual([]);
  });

  it('a Plex scrobble unhides it', async () => {
    setup();
    await patch({ paused: 'hide' });
    onTmdb('/find/tt0000103', {
      tv_episode_results: [
        {
          air_date: '2020-01-08',
          episode_number: 2,
          id: 1,
          name: 'Episode 2',
          runtime: 30,
          season_number: 1,
          show_id: SHOW,
          still_path: null,
        },
      ],
    });
    const event = {
      Records: [
        {
          attributes: { SentTimestamp: String(Date.UTC(2024, 0, 1)) },
          body: JSON.stringify({
            metadata: { plex: { Guid: [{ id: 'imdb://tt0000103' }] } },
            userId: USER_ID,
          }),
          messageId: 'm1',
        },
      ],
    } as unknown as SQSEvent;
    expect(await scrobbleHandler(event, lambdaContext())).toEqual({
      batchItemFailures: [],
    });
    expect(await prefs()).toMatchObject({ paused: null });
  });
});
