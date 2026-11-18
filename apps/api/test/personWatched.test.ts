import { describe, expect, it } from 'vitest';

import { db } from './db';
import { onTmdb } from './fakeHttp';
import { request } from './request';
import { OTHER_USER_ID, seedUser, USER_ID } from './seed';

const credit = (id: number, character: string, episodes: number) => ({
  character,
  credit_id: `c${id}`,
  episode_count: episodes,
  first_air_date: '2010-01-01',
  genre_ids: [18],
  id,
  name: `Show ${id}`,
  poster_path: `/p${id}.jpg`,
});

const listItem = (userId: string, list: string, seriesId: number) => ({
  id: seriesId,
  pk: `USER#${userId}`,
  sk: `LIST#${list}#ITEM#${seriesId}`,
});

const watchedEpisodes = (userId: string, seriesId: number, count: number) =>
  Array.from({ length: count }, (_, index) => ({
    episodeNumber: index + 1,
    gsi1pk: `USER#${userId}#SERIES#${seriesId}`,
    gsi1sk: `S01#E${String(index + 1).padStart(2, '0')}`,
    pk: `USER#${userId}`,
    seasonNumber: 1,
    seriesId,
    sk: `SERIES#${seriesId}#S01#E${String(index + 1).padStart(2, '0')}`,
    userId,
  }));

const setup = () => {
  seedUser();
  seedUser({ id: OTHER_USER_ID });
  onTmdb('/person/1/tv_credits', {
    cast: [
      credit(500, 'Walter White', 62),
      credit(501, 'Hal', 20),
      credit(502, 'Cop', 1),
      credit(503, 'Himself', 3),
      { ...credit(504, 'Lead', 0), first_air_date: '' },
    ],
  });
  onTmdb('/tv/504', { id: 504, status: 'Planned' });
  db.seed('Lists', [
    listItem(USER_ID, 'WATCHED', 500),
    listItem(USER_ID, 'IN_PROGRESS', 501),
    listItem(USER_ID, 'WATCHED', 503),
    listItem(USER_ID, 'WATCHED', 999),
    listItem(USER_ID, 'FAVORITES', 502),
    listItem(OTHER_USER_ID, 'WATCHED', 502),
  ]);
  db.seed('Watched', [
    ...watchedEpisodes(USER_ID, 500, 70),
    ...watchedEpisodes(USER_ID, 501, 5),
    ...watchedEpisodes(USER_ID, 503, 2),
    ...watchedEpisodes(USER_ID, 999, 9),
    ...watchedEpisodes(OTHER_USER_ID, 502, 1),
  ]);
};

describe('person watched line', () => {
  it('counts the viewer\'s episodes and shows of this person ("Watched 67 episodes, 2 of 4 shows")', async () => {
    setup();

    const response = await request('/me/person/1/watched', { as: USER_ID });

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await response.json()).toEqual({
      episodes: 67,
      items: [
        {
          episodeCount: 62,
          episodesWatched: 62,
          seriesId: 500,
          state: 'watched',
        },
        {
          episodeCount: 20,
          episodesWatched: 5,
          seriesId: 501,
          state: 'in-progress',
        },
      ],
      shows: 2,
      totalShows: 4,
    });
  });

  it('counts with eventually consistent reads (nothing here needs read-your-writes)', async () => {
    setup();
    const from = db.calls.length;

    await request('/me/person/1/watched', { as: USER_ID });

    const watchedReads = db.calls
      .slice(from)
      .map((command) => command.input as Record<string, unknown>)
      .filter((input) => input.TableName === 'Watched');
    expect(watchedReads.length).toBeGreaterThan(0);
    expect(watchedReads.some((input) => input.ConsistentRead)).toBe(false);
  });

  it('never counts "Self" appearances or shows he is not in', async () => {
    setup();

    const response = await request('/me/person/1/watched', { as: USER_ID });
    const { items } = (await response.json()) as {
      items: Array<{ seriesId: number }>;
    };

    expect(items.map((item) => item.seriesId)).toEqual([500, 501]);
  });

  it('is empty for a viewer who watched none of his work', async () => {
    setup();
    seedUser({ id: '01JUSERCCCCCCCCCCCCCCCCCCC' });

    const response = await request('/me/person/1/watched', {
      as: '01JUSERCCCCCCCCCCCCCCCCCCC',
    });

    expect(await response.json()).toEqual({
      episodes: 0,
      items: [],
      shows: 0,
      totalShows: 4,
    });
  });

  it('needs a signed-in viewer', async () => {
    setup();

    const response = await request('/me/person/1/watched');

    expect(response.status).toBe(401);
  });

  it('404s for an unknown person', async () => {
    seedUser();

    const response = await request('/me/person/999/watched', { as: USER_ID });

    expect(response.status).toBe(404);
  });

  it('rejects a bad id', async () => {
    seedUser();

    const response = await request('/me/person/abc/watched', { as: USER_ID });

    expect(response.status).toBe(400);
  });
});
