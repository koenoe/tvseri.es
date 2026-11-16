import { describe, expect, it } from 'vitest';

import { onTmdb } from './fakeHttp';
import { fakeShow } from './fixtures/tmdb';
import { seedLibrary } from './library';
import { request } from './request';
import { OTHER_USER_ID, seedUser, USER_ID } from './seed';

// The viewer follows three people: CLOSEST (OTHER_USER_ID), MIDDLE, FAR
const CLOSEST = OTHER_USER_ID;
const MIDDLE = '01JUSERCCCCCCCCCCCCCCCCCCC';
const FAR = '01JUSERDDDDDDDDDDDDDDDDDDD';

const show = (id: number, genreId = 18) =>
  fakeShow({
    extra: { genres: [{ id: genreId, name: `genre ${genreId}` }] },
    id,
    seasons: [{ airDate: '2020-01-01', episodes: 3 }],
  });

const follow = (target: string) =>
  request(`/user/${target}/follow`, { as: USER_ID, method: 'POST' });

const setup = async () => {
  seedUser();
  seedUser({ id: CLOSEST });
  seedUser({ id: MIDDLE });
  seedUser({ id: FAR });
  onTmdb('/genre/tv/list', {
    genres: [
      { id: 16, name: 'Animation' },
      { id: 18, name: 'Drama' },
    ],
  });
  for (const id of [1, 2, 3, 4, 5, 6, 50, 60, 80, 99]) show(id);
  show(70, 16);

  seedLibrary(USER_ID, {
    FAVORITES: [1, 2],
    WATCHED: [1, 2, 3, 4, 5, 6],
    WATCHLIST: [99],
  });
  // Both favourites shared, four finished shared: the closest match
  seedLibrary(CLOSEST, {
    FAVORITES: [1, 2, 50],
    WATCHED: [1, 2, 3, 4, 5, 6, 50, 60, 99],
  });
  seedLibrary(MIDDLE, { WATCHED: [1, 2, 3, 60, 70] });
  seedLibrary(FAR, { FAVORITES: [80], WATCHED: [1, 80] });

  for (const target of [FAR, MIDDLE, CLOSEST]) {
    await follow(target);
  }
};

const person = (id: string, level: string | null, arc: number) => ({
  arc,
  id,
  level,
  username: `user-${id.slice(-4).toLowerCase()}`,
});

const tasteShow = (id: number) => ({
  id,
  posterImage: expect.stringContaining(`/poster-${id}.jpg`),
  slug: `show-${id}`,
  title: `Show ${id}`,
});

describe('GET /me/circle: From your circle (V60)', () => {
  it('picks three unseen shows from the people you follow, closest match first', async () => {
    await setup();

    const response = await request('/me/circle', { as: USER_ID });

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await response.json()).toEqual({
      followingCount: 3,
      picks: [
        // A favourite of your closest match
        {
          doorGenre: null,
          kind: 'favourite',
          people: [person(CLOSEST, 'low', 30)],
          show: tasteShow(50),
        },
        // Both your closest matches finished it
        {
          doorGenre: null,
          kind: 'finished',
          people: [person(CLOSEST, 'low', 30), person(MIDDLE, null, 0)],
          show: tasteShow(60),
        },
        // The best of the rest: a door to a genre you have none of
        {
          doorGenre: 'Animation',
          kind: 'finished',
          people: [person(MIDDLE, null, 0)],
          show: tasteShow(70),
        },
      ],
    });
  });

  it('leaves out people whose account is being deleted', async () => {
    await setup();
    seedUser({ deletionRequestedAt: 1, id: CLOSEST });

    const circle = (await (
      await request('/me/circle', { as: USER_ID })
    ).json()) as {
      followingCount: number;
      picks: Array<{ show: { id: number }; people: Array<{ id: string }> }>;
    };

    expect(circle.followingCount).toBe(2);
    expect(circle.picks.map((pick) => pick.show.id)).toEqual([80, 60, 70]);
    expect(
      circle.picks.flatMap((pick) => pick.people.map((p) => p.id)),
    ).not.toContain(CLOSEST);
  });

  it('is empty when you follow nobody', async () => {
    seedUser();
    seedLibrary(USER_ID, { WATCHED: [1] });

    const response = await request('/me/circle', { as: USER_ID });

    expect(await response.json()).toEqual({ followingCount: 0, picks: [] });
  });

  it('needs a signed-in viewer', async () => {
    seedUser();

    expect((await request('/me/circle')).status).toBe(401);
  });
});
