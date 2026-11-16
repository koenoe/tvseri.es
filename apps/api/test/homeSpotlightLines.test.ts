import type { SpotlightLines } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { db } from './db';
import { onGet, onTmdb } from './fakeHttp';
import { fakeShow } from './fixtures/tmdb';
import { request } from './request';
import { OTHER_USER_ID, seedUser, USER_ID } from './seed';

const listItem = (list: string, id: number, userId = USER_ID) => ({
  createdAt: 1,
  gsi2pk: `LIST#${userId}#${list}`,
  gsi2sk: 1,
  id,
  pk: `USER#${userId}`,
  sk: `LIST#${list}#ITEM#${id}`,
  title: `Show ${id}`,
});

const trending = (ids: number[]) =>
  onGet('https://api.mdblist.com/lists/koenoe/trending/items', {
    shows: ids.map((id) => ({ id, mediaType: 'show', title: `Show ${id}` })),
  });

const tv = (id: number, name: string) => ({
  id,
  name,
  poster_path: `/p${id}.jpg`,
});

const get = async (path: string, as = USER_ID) => {
  const response = await request(path, { as });
  return {
    body: (await response.json()) as SpotlightLines,
    cacheControl: response.headers.get('cache-control'),
    status: response.status,
  };
};

describe('GET /me/home/spotlight-lines', () => {
  const setup = () => {
    seedUser();
    db.seed('Lists', [
      listItem('FAVORITES', 95),
      listItem('WATCHED', 95),
      listItem('WATCHED', 136),
      listItem('WATCHED', 60),
      listItem('IN_PROGRESS', 70),
    ]);
    onTmdb('/tv/1', {
      genres: [{ id: 10765, name: 'Sci-Fi & Fantasy' }],
      id: 1,
      name: 'Pluribus',
      recommendations: { results: [tv(136, 'The Bear'), tv(95, 'Severance')] },
      vote_average: 8.4,
      vote_count: 400,
    });
    onTmdb('/tv/2', {
      genres: [{ id: 35, name: 'Comedy' }],
      id: 2,
      name: 'Barry',
      recommendations: { results: [tv(3, 'Other'), tv(136, 'The Bear')] },
      vote_average: 8.1,
      vote_count: 4000,
    });
    onTmdb('/tv/4', {
      genres: [{ id: 10765, name: 'Sci-Fi & Fantasy' }],
      id: 4,
      name: 'Stranger Things',
      recommendations: { results: [tv(3, 'Other')] },
      vote_average: 8.6,
      vote_count: 18000,
    });
    onTmdb('/tv/5', {
      genres: [{ id: 18, name: 'Drama' }],
      id: 5,
      name: 'Plain',
      recommendations: { results: [] },
      vote_average: 6.2,
      vote_count: 90,
    });
    trending([1, 2, 4, 5, 60, 70]);
  };

  it('needs a signed-in user', async () => {
    expect((await request('/me/home/spotlight-lines')).status).toBe(401);
  });

  it('says why each trending show is for the viewer: a favourite first, then a finished show, then top rated and unseen', async () => {
    setup();

    const { body, cacheControl } = await get('/me/home/spotlight-lines');

    expect(body).toEqual({
      lines: {
        '1': { kind: 'favorite', title: 'Severance' },
        '2': { kind: 'finished', title: 'The Bear' },
        '4': { genre: 'Sci-Fi & Fantasy', kind: 'top-rated' },
        '5': null,
        '60': null,
        '70': null,
      },
    });
    expect(cacheControl).toBe('private, max-age=86400');
  });

  it('shares the TMDB part across viewers through the Cache table', async () => {
    setup();
    await get('/me/home/spotlight-lines');

    expect(db.dump('Cache').map((item) => item.pk)).toContain(
      'CACHE#home:spotlight-line:v1:1',
    );
  });

  it('reads the shared facts of every trending show in one batch', async () => {
    setup();
    await get('/me/home/spotlight-lines');
    db.calls.length = 0;

    await get('/me/home/spotlight-lines');

    const cacheReads = db.calls.filter((command) =>
      JSON.stringify(command.input).includes('home:spotlight-line:'),
    );
    expect(cacheReads.map((command) => command.constructor.name)).toEqual([
      'BatchGetItemCommand',
    ]);
  });

  it('answers each viewer from their own library over the same shared facts', async () => {
    setup();
    seedUser({ id: OTHER_USER_ID });
    db.seed('Lists', [listItem('FAVORITES', 136, OTHER_USER_ID)]);

    const mine = await get('/me/home/spotlight-lines');
    const theirs = await get('/me/home/spotlight-lines', OTHER_USER_ID);

    expect(mine.body.lines['1']).toEqual({
      kind: 'favorite',
      title: 'Severance',
    });
    expect(theirs.body.lines['1']).toEqual({
      kind: 'favorite',
      title: 'The Bear',
    });
    expect(theirs.body.lines['60']).toBeNull();
  });

  it('only works on its own trending list, whatever ids are asked for', async () => {
    setup();

    const { body } = await get('/me/home/spotlight-lines?ids=999,998');

    expect(Object.keys(body.lines)).toEqual(['1', '2', '4', '5', '60', '70']);
  });

  it('remembers a show TMDB doesn’t know, so it isn’t asked again', async () => {
    setup();
    trending([404]);
    onTmdb('/tv/404', { status_message: 'nope' }, { status: 404 });

    await get('/me/home/spotlight-lines');

    expect(db.dump('Cache').map((item) => item.pk)).toContain(
      'CACHE#home:spotlight-line:v1:404',
    );
  });
});

const pad = (value: number) => String(value).padStart(2, '0');

const watchedEpisodes = (
  seriesId: number,
  episodes: ReadonlyArray<readonly [number, number]>,
) =>
  db.seed(
    'Watched',
    episodes.map(([season, episode], index) => ({
      episodeNumber: episode,
      gsi1pk: `USER#${USER_ID}#SERIES#${seriesId}`,
      gsi1sk: `S${pad(season)}#E${pad(episode)}`,
      pk: `USER#${USER_ID}`,
      seasonNumber: season,
      seriesId,
      sk: `SERIES#${seriesId}#S${pad(season)}#E${pad(episode)}`,
      userId: USER_ID,
      watchedAt: Date.parse('2026-01-10T20:00:00Z') + index * 1000,
    })),
  );

describe('GET /me/home/spotlight-lines: up to date', () => {
  // Dept. Q (8) is like Slow Horses (80), which the viewer is watching;
  // Dept. Q is also top rated, which comes after up to date
  const setup = () => {
    seedUser();
    db.seed('Lists', [listItem('IN_PROGRESS', 80)]);
    onTmdb('/tv/8', {
      genres: [{ id: 80, name: 'Crime' }],
      id: 8,
      name: 'Dept. Q',
      recommendations: { results: [tv(80, 'Slow Horses')] },
      vote_average: 8.3,
      vote_count: 2000,
    });
    // Two seasons of three, all aired
    fakeShow({
      id: 80,
      name: 'Slow Horses',
      seasons: [
        { airDate: '2024-01-01', episodes: 3 },
        { airDate: '2025-01-01', episodes: 3 },
      ],
      status: 'Returning Series',
    });
    trending([8]);
  };

  it('is like a show the viewer is watching and up to date with', async () => {
    setup();
    watchedEpisodes(80, [
      [1, 1],
      [1, 2],
      [1, 3],
      [2, 1],
      [2, 2],
      [2, 3],
    ]);

    const { body } = await get('/me/home/spotlight-lines');

    expect(body.lines['8']).toEqual({
      kind: 'up-to-date',
      title: 'Slow Horses',
    });
  });

  it('counts a skipped episode as caught up', async () => {
    setup();
    watchedEpisodes(80, [
      [1, 1],
      [1, 2],
      [1, 3],
      [2, 1],
      [2, 3],
    ]);
    db.seed('Lists', [
      {
        pk: `USER#${USER_ID}`,
        seriesId: 80,
        sk: 'PREF#SERIES#80',
        skipped: new Set(['S02E02']),
      },
    ]);

    const { body } = await get('/me/home/spotlight-lines');

    expect(body.lines['8']).toEqual({
      kind: 'up-to-date',
      title: 'Slow Horses',
    });
  });

  it('gives a viewer who is behind no up-to-date line (top rated instead)', async () => {
    setup();
    watchedEpisodes(80, [
      [1, 1],
      [1, 2],
      [1, 3],
      [2, 1],
    ]);

    const { body } = await get('/me/home/spotlight-lines');

    expect(body.lines['8']).toEqual({ genre: 'Crime', kind: 'top-rated' });
  });

  it('comes after a favourite and a finished show', async () => {
    setup();
    watchedEpisodes(80, [
      [1, 1],
      [1, 2],
      [1, 3],
      [2, 1],
      [2, 2],
      [2, 3],
    ]);
    db.seed('Lists', [listItem('WATCHED', 136), listItem('FAVORITES', 95)]);
    onTmdb('/tv/9', {
      genres: [{ id: 80, name: 'Crime' }],
      id: 9,
      name: 'Liked',
      recommendations: {
        results: [tv(80, 'Slow Horses'), tv(95, 'Severance')],
      },
      vote_average: 5,
      vote_count: 10,
    });
    onTmdb('/tv/10', {
      genres: [{ id: 80, name: 'Crime' }],
      id: 10,
      name: 'Finished',
      recommendations: {
        results: [tv(80, 'Slow Horses'), tv(136, 'The Bear')],
      },
      vote_average: 5,
      vote_count: 10,
    });
    trending([8, 9, 10]);

    const { body } = await get('/me/home/spotlight-lines');

    expect(body.lines).toEqual({
      '8': { kind: 'up-to-date', title: 'Slow Horses' },
      '9': { kind: 'favorite', title: 'Severance' },
      '10': { kind: 'finished', title: 'The Bear' },
    });
  });
});
