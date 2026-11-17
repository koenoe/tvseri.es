import { describe, expect, it, vi } from 'vitest';

import { db } from './db';
import { onTmdb, requestedUrls, resetRequests } from './fakeHttp';
import { fakeShow } from './fixtures/tmdb';
import { seedLibrary, tmdbEpisode } from './library';
import { request } from './request';
import { OTHER_USER_ID, seedUser, USER_ID } from './seed';

const library = (
  userId: string,
  lists: Record<string, ReadonlyArray<number>>,
) =>
  db.seed(
    'Lists',
    Object.entries(lists).flatMap(([list, ids]) =>
      ids.map((id) => ({
        id,
        pk: `USER#${userId}`,
        sk: `LIST#${list}#ITEM#${id}`,
      })),
    ),
  );

const setup = () => {
  seedUser();
  seedUser({ id: OTHER_USER_ID });
  for (const id of [1, 2, 3, 4, 5, 6, 10, 11, 12]) {
    fakeShow({
      id,
      seasons: [{ airDate: '2020-01-01', episodes: 3 }],
    });
  }
  library(USER_ID, {
    FAVORITES: [1, 2],
    IN_PROGRESS: [5],
    WATCHED: [1, 2, 3, 4],
    WATCHLIST: [9],
  });
  library(OTHER_USER_ID, {
    FAVORITES: [1, 3, 10],
    IN_PROGRESS: [6],
    WATCHED: [1, 2, 3, 4, 5, 10, 11, 12],
  });
};

const match = (as: string | undefined, target: string) =>
  request(`/user/${target}/match`, { as });

describe('match line', () => {
  it('computes the taste match, "New to you" and the follow flags', async () => {
    setup();
    await request(`/user/${USER_ID}/follow`, {
      as: OTHER_USER_ID,
      method: 'POST',
    });

    const response = await match(USER_ID, OTHER_USER_ID);

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await response.json()).toEqual({
      following: false,
      followsYou: true,
      match: {
        arc: 30,
        level: 'low',
        notEnough: false,
        sharedCount: 5,
        sharedShows: (
          [
            [1, 'both-favourite', null],
            [2, 'both-finished', 1],
            [3, 'both-finished', 1],
            [4, 'both-finished', 1],
            [5, 'both-watching', null],
          ] as const
        ).map(([id, relation, finishedSeason]) => ({
          finishedSeason,
          genreId: 18,
          id,
          next: null,
          posterImage: expect.stringContaining(`/poster-${id}.jpg`),
          relation,
          seasonCount: 1,
          slug: `show-${id}`,
          title: `Show ${id}`,
          year: 2020,
        })),
      },
      newToYou: (
        [
          [10, 'favourite'],
          [11, 'finished'],
          [12, 'finished'],
          [6, 'watching'],
        ] as const
      ).map(([id, reason]) => ({
        id,
        posterImage: expect.stringContaining(`/poster-${id}.jpg`),
        reason,
        slug: `show-${id}`,
        title: `Show ${id}`,
      })),
      split: { theirs: null, yours: null },
    });
  });

  it('has no level under 5 shared shows', async () => {
    seedUser();
    seedUser({ id: OTHER_USER_ID });
    library(USER_ID, { WATCHED: [1, 2] });
    library(OTHER_USER_ID, { WATCHED: [1, 2, 3] });

    const response = await match(USER_ID, OTHER_USER_ID);

    expect(await response.json()).toMatchObject({
      match: { arc: 0, level: null, notEnough: true, sharedCount: 2 },
    });
  });

  it('needs a signed-in viewer', async () => {
    setup();

    expect((await match(undefined, OTHER_USER_ID)).status).toBe(401);
  });

  it('is a 400 for your own profile', async () => {
    setup();

    expect((await match(USER_ID, USER_ID)).status).toBe(400);
  });

  it('404s for an unknown user', async () => {
    seedUser();

    expect((await match(USER_ID, '01JUNKNOWNAAAAAAAAAAAAAAA')).status).toBe(
      404,
    );
  });
});

type MatchBody = Readonly<{
  match: { sharedShows: Array<Record<string, unknown>> };
  split: Record<string, unknown>;
}>;

const matchBody = async (as: string, target: string) =>
  (await (await match(as, target)).json()) as MatchBody;

describe('match: what is next for a shared show (You both watch)', () => {
  const sharedNext = async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-12T12:00:00Z'));
    seedUser();
    seedUser({ id: OTHER_USER_ID });
    // 1: season 2 premieres on 7 Jan
    fakeShow({
      extra: { next_episode_to_air: tmdbEpisode(2, 1, '2027-01-07') },
      id: 1,
      seasons: [
        { airDate: '2025-01-01', episodes: 4 },
        { airDate: '2027-01-07', aired: 0, episodes: 8 },
      ],
      status: 'Returning Series',
    });
    // 2: season 2 is airing, E03 on 15 Nov
    fakeShow({
      extra: { next_episode_to_air: tmdbEpisode(2, 3, '2026-11-15') },
      id: 2,
      seasons: [
        { airDate: '2025-01-01', episodes: 4 },
        { airDate: '2026-11-01', aired: 2, episodes: 8 },
      ],
      status: 'Returning Series',
    });
    // 3: season 2 finished airing on 5 Nov (within 14 days)
    fakeShow({
      id: 3,
      seasons: [
        { airDate: '2025-01-01', episodes: 4 },
        { airDate: '2026-10-15', episodes: 4 },
      ],
      status: 'Returning Series',
    });
    // 4: finished airing in September
    fakeShow({
      id: 4,
      seasons: [
        { airDate: '2025-01-01', episodes: 4 },
        { airDate: '2026-08-01', episodes: 4 },
      ],
    });
    // 5: airing, but season 3 already has a premiere date: the premiere wins
    fakeShow({
      extra: { next_episode_to_air: tmdbEpisode(2, 2, '2026-11-14') },
      id: 5,
      seasons: [
        { airDate: '2025-01-01', episodes: 4 },
        { airDate: '2026-11-07', aired: 1, episodes: 2 },
        { airDate: '2027-03-01', aired: 0, episodes: 6 },
      ],
      status: 'Returning Series',
    });
    library(USER_ID, { IN_PROGRESS: [1, 2, 5], WATCHED: [3, 4] });
    library(OTHER_USER_ID, { IN_PROGRESS: [2, 5], WATCHED: [1, 3, 4] });
    return matchBody(USER_ID, OTHER_USER_ID);
  };

  it('dates the next season, the next episode, or says a season is out', async () => {
    const { match: result } = await sharedNext();
    const byId = new Map(result.sharedShows.map((show) => [show.id, show]));

    expect(byId.get(1)).toMatchObject({
      next: { date: '2027-01-07', kind: 'season-premiere', season: 2 },
      relation: 'both-watching',
    });
    expect(byId.get(2)).toMatchObject({
      next: { date: '2026-11-15', episode: 3, kind: 'episode', season: 2 },
    });
    expect(byId.get(3)).toMatchObject({
      finishedSeason: 2,
      next: { kind: 'season-out', season: 2 },
      relation: 'both-finished',
    });
    expect(byId.get(4)).toMatchObject({
      finishedSeason: 2,
      next: null,
      relation: 'both-finished',
    });
    expect(byId.get(5)).toMatchObject({
      next: { date: '2027-03-01', kind: 'season-premiere', season: 3 },
    });
  });
});

describe('match: a shared show’s own facts (You both watch)', () => {
  it('names the first air year, the season count and the first genre, from the facts alone', async () => {
    seedUser();
    seedUser({ id: OTHER_USER_ID });
    fakeShow({
      extra: {
        genres: [
          { id: 80, name: 'Crime' },
          { id: 18, name: 'Drama' },
        ],
      },
      id: 1,
      seasons: [
        { airDate: '2019-03-01', episodes: 4 },
        { airDate: '2021-03-01', episodes: 4 },
        { airDate: '2023-03-01', episodes: 4 },
      ],
    });
    // Nothing known: no air date, no genre, no regular season
    fakeShow({
      extra: { first_air_date: '', genres: [] },
      id: 2,
      seasons: [],
    });
    library(USER_ID, { WATCHED: [1, 2] });
    library(OTHER_USER_ID, { WATCHED: [1, 2] });
    resetRequests();

    const { match: result } = await matchBody(USER_ID, OTHER_USER_ID);
    const byId = new Map(result.sharedShows.map((show) => [show.id, show]));

    expect(byId.get(1)).toMatchObject({
      genreId: 80,
      seasonCount: 3,
      year: 2019,
    });
    expect(byId.get(2)).toMatchObject({ id: 2 });
    expect(byId.get(2)).not.toHaveProperty('year');
    expect(byId.get(2)).not.toHaveProperty('seasonCount');
    expect(byId.get(2)).not.toHaveProperty('genreId');
    // the genre stays an id: no genre list read for it
    expect(
      requestedUrls().some((url) => url.pathname.includes('/genre/tv/list')),
    ).toBe(false);
  });
});

describe('match: where your tastes split', () => {
  const genre = (id: number, genreId: number) =>
    fakeShow({
      extra: { genres: [{ id: genreId, name: `genre ${genreId}` }] },
      id,
      seasons: [{ airDate: '2020-01-01', episodes: 3 }],
    });

  const tasteSetup = () => {
    seedUser();
    seedUser({ id: OTHER_USER_ID });
    onTmdb('/genre/tv/list', {
      genres: [
        { id: 16, name: 'Animation' },
        { id: 18, name: 'Drama' },
        { id: 37, name: 'Western' },
        { id: 80, name: 'Crime' },
      ],
    });
    // Animation (101-104) and Western (301-304): only the owner's
    for (const id of [101, 102, 103, 104]) genre(id, 16);
    for (const id of [301, 302, 303, 304]) genre(id, 37);
    // Crime: three of the viewer's, two of them the owner's too
    for (const id of [201, 202, 203]) genre(id, 80);
    // Drama: both have plenty
    for (const id of [1, 2, 3, 4]) genre(id, 18);
  };

  it("names the owner's genre the viewer lacks, and the viewer's the owner barely has", async () => {
    tasteSetup();
    seedLibrary(OTHER_USER_ID, {
      FAVORITES: [101],
      IN_PROGRESS: [301, 302],
      WATCHED: [102, 103, 104, 303, 304, 201, 202, 1, 2, 3, 4],
    });
    seedLibrary(USER_ID, {
      IN_PROGRESS: [203],
      WATCHED: [201, 202, 1, 2, 3, 4],
    });

    const { split } = await matchBody(USER_ID, OTHER_USER_ID);

    // Animation and Western tie at 4: alphabetical
    expect(split).toEqual({
      theirs: { genre: 'Animation', ownerCount: 4, viewerCount: 0 },
      yours: { genre: 'Crime', ownerCount: 2, viewerCount: 3 },
    });
  });

  it('has no side under 3 shows of a genre, or when the other has more than 2', async () => {
    tasteSetup();
    seedLibrary(OTHER_USER_ID, { WATCHED: [101, 102, 201, 202, 203] });
    seedLibrary(USER_ID, { WATCHED: [201, 202, 203, 1, 2] });

    const { split } = await matchBody(USER_ID, OTHER_USER_ID);

    expect(split).toEqual({ theirs: null, yours: null });
  });
});
