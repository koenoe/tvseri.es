import { BatchGetItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import {
  SERIES_STATES_MAX_IDS,
  type SeriesStates,
  SeriesStatesSchema,
  type UpNextItem,
} from '@tvseri.es/schemas';
import * as v from 'valibot';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildRollups } from '@/lib/rollups';
import { db } from './db';
import { onTmdb, requestedUrls, resetRequests } from './fakeHttp';
import { fakeShow } from './fixtures/tmdb';
import { episodes, seedLibrary, seedWatched, tmdbEpisode } from './library';
import { measureRounds } from './readRounds';
import { request } from './request';
import { OTHER_USER_ID, seedUser, USER_ID } from './seed';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-12T12:00:00Z'));
});

const NEW = 101;
const WATCHLIST = 102;
/** In progress: S02E04 next, specials left unwatched */
const WATCHING = 103;
/** In progress, every aired episode watched, the next one airs in a week */
const CAUGHT_UP = 104;
/** Finished: the season 2 finale watched, season 3 dated */
const BETWEEN_SEASONS = 105;
const ENDED = 106;
/** On the watchlist and in progress (data from before watchlist parking) */
const WATCHLIST_AND_WATCHING = 107;
/** Only a special watched: in no list */
const SPECIAL_ONLY = 108;
/** Finished, renewed without a date */
const RENEWED = 109;
const CANCELED = 110;
/** In progress, every episode watched, and the show has ended */
const IN_PROGRESS_ENDED = 113;

const skip = (userId: string, seriesId: number, codes: string[]) =>
  db.seed('Lists', [
    {
      pk: `USER#${userId}`,
      sk: `PREF#SERIES#${seriesId}`,
      skipped: new Set(codes),
    },
  ]);

const setup = () => {
  seedUser();
  seedUser({ id: OTHER_USER_ID, username: 'other' });

  fakeShow({
    id: WATCHING,
    seasons: [
      { airDate: '2024-01-01', episodes: 8 },
      { airDate: '2026-06-01', episodes: 15 },
    ],
    specials: { airDate: '2023-12-01', episodes: 2 },
    status: 'Returning Series',
  });
  fakeShow({
    extra: { next_episode_to_air: tmdbEpisode(1, 7, '2026-11-19') },
    id: CAUGHT_UP,
    seasons: [{ airDate: '2026-10-01', aired: 6, episodes: 10 }],
    status: 'Returning Series',
  });
  fakeShow({
    extra: {
      last_episode_to_air: tmdbEpisode(2, 8, '2025-05-20'),
      next_episode_to_air: tmdbEpisode(3, 1, '2027-01-07'),
    },
    id: BETWEEN_SEASONS,
    seasons: [
      { airDate: '2024-01-01', episodes: 8 },
      { airDate: '2025-04-01', episodes: 8 },
      { airDate: '2027-01-07', aired: 0, episodes: 8 },
    ],
    status: 'Returning Series',
  });
  fakeShow({
    id: ENDED,
    seasons: [{ airDate: '2020-01-01', episodes: 8 }],
    status: 'Ended',
  });
  fakeShow({
    id: WATCHLIST_AND_WATCHING,
    seasons: [{ airDate: '2025-01-01', episodes: 6 }],
    status: 'Ended',
  });
  fakeShow({
    id: RENEWED,
    seasons: [{ airDate: '2024-01-01', episodes: 8 }],
    status: 'Returning Series',
  });
  fakeShow({
    id: CANCELED,
    seasons: [{ airDate: '2020-01-01', episodes: 8 }],
    status: 'Canceled',
  });
  fakeShow({
    id: IN_PROGRESS_ENDED,
    seasons: [{ airDate: '2020-01-01', episodes: 4 }],
    status: 'Ended',
  });

  seedLibrary(USER_ID, {
    IN_PROGRESS: [
      WATCHING,
      CAUGHT_UP,
      WATCHLIST_AND_WATCHING,
      IN_PROGRESS_ENDED,
    ],
    WATCHED: [BETWEEN_SEASONS, ENDED, RENEWED, CANCELED],
    WATCHLIST: [WATCHLIST, WATCHLIST_AND_WATCHING],
  });
  seedWatched(USER_ID, WATCHING, [
    ...episodes(1, 1, 8),
    ...episodes(2, 1, 3),
    [0, 1],
  ]);
  seedWatched(USER_ID, CAUGHT_UP, episodes(1, 1, 6));
  seedWatched(USER_ID, WATCHLIST_AND_WATCHING, episodes(1, 1, 2));
  skip(USER_ID, WATCHLIST_AND_WATCHING, ['S01E03']);
  seedWatched(USER_ID, IN_PROGRESS_ENDED, episodes(1, 1, 4));
  seedWatched(USER_ID, SPECIAL_ONLY, [[0, 1]]);

  // Someone else's library: none of it may reach the viewer's answer
  seedLibrary(OTHER_USER_ID, {
    IN_PROGRESS: [NEW],
    WATCHED: [WATCHLIST],
    WATCHLIST: [SPECIAL_ONLY],
  });
  seedWatched(OTHER_USER_ID, NEW, episodes(1, 1, 2));
  fakeShow({ id: NEW, seasons: [{ airDate: '2020-01-01', episodes: 4 }] });
};

const ALL = [
  NEW,
  WATCHLIST,
  WATCHING,
  CAUGHT_UP,
  BETWEEN_SEASONS,
  ENDED,
  WATCHLIST_AND_WATCHING,
  SPECIAL_ONLY,
  RENEWED,
  CANCELED,
  IN_PROGRESS_ENDED,
];

const states = async (ids: ReadonlyArray<number> | string, as = USER_ID) => {
  const response = await request(
    `/me/series-states?ids=${typeof ids === 'string' ? ids : ids.join(',')}`,
    { as },
  );
  return response;
};

const body = async (response: Response) =>
  v.parse(SeriesStatesSchema, await response.json()) as SeriesStates;

describe('GET /me/series-states', () => {
  it('needs a signed-in user', async () => {
    expect((await request(`/me/series-states?ids=${NEW}`)).status).toBe(401);
  });

  it("answers the viewer's state for every asked id, keyed by the id as a string", async () => {
    setup();

    const response = await states(ALL);

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    const { states: byId } = await body(response);
    expect(byId).toEqual({
      [BETWEEN_SEASONS]: {
        nextAirDate: '2027-01-07',
        onWatchlist: false,
        state: 'up-to-date',
      },
      [CANCELED]: { onWatchlist: false, state: 'finished' },
      [CAUGHT_UP]: {
        nextAirDate: '2026-11-19',
        onWatchlist: false,
        state: 'up-to-date',
      },
      [ENDED]: { onWatchlist: false, state: 'finished' },
      [IN_PROGRESS_ENDED]: { onWatchlist: false, state: 'finished' },
      [NEW]: { onWatchlist: false, state: 'new' },
      [RENEWED]: { onWatchlist: false, state: 'up-to-date' },
      [SPECIAL_ONLY]: { onWatchlist: false, state: 'new' },
      [WATCHING]: {
        next: { episodeNumber: 4, seasonNumber: 2 },
        onWatchlist: false,
        seasonTotal: 15,
        seasonWatched: 3,
        state: 'watching',
      },
      [WATCHLIST]: { onWatchlist: true, state: 'watchlist' },
      // Progress wins over the watchlist; the skip of S01E03 is a mark
      [WATCHLIST_AND_WATCHING]: {
        next: { episodeNumber: 4, seasonNumber: 1 },
        onWatchlist: true,
        seasonTotal: 6,
        seasonWatched: 2,
        state: 'watching',
      },
    });
  });

  it("agrees with Continue watching on the next episode and the season's progress", async () => {
    setup();

    const [overview, answer] = await Promise.all([
      request('/me/overview?view=up-next', { as: USER_ID }),
      states(ALL),
    ]);
    const { upNext } = (await overview.json()) as {
      upNext: ReadonlyArray<UpNextItem>;
    };
    const { states: byId } = await body(answer);

    expect(upNext.length).toBeGreaterThan(0);
    for (const item of upNext) {
      expect(byId[item.seriesId]).toMatchObject({
        next: { episodeNumber: item.episode, seasonNumber: item.season },
        seasonTotal: item.seasonTotal,
        seasonWatched: item.seasonWatched,
        state: 'watching',
      });
    }
    const watching = Object.entries(byId)
      .filter(([, state]) => state.state === 'watching')
      .map(([id]) => Number(id))
      .sort();
    expect(watching).toEqual(upNext.map((item) => item.seriesId).sort());
  });

  it("answers another user's own states, never the viewer's", async () => {
    setup();

    const { states: byId } = await body(
      await states([NEW, WATCHLIST, SPECIAL_ONLY, WATCHING], OTHER_USER_ID),
    );

    expect(byId).toEqual({
      [NEW]: {
        next: { episodeNumber: 3, seasonNumber: 1 },
        onWatchlist: false,
        seasonTotal: 4,
        seasonWatched: 2,
        state: 'watching',
      },
      [SPECIAL_ONLY]: { onWatchlist: true, state: 'watchlist' },
      [WATCHING]: { onWatchlist: false, state: 'new' },
      [WATCHLIST]: { onWatchlist: false, state: 'finished' },
    });
  });

  it("degrades a show whose facts can't be read instead of failing the answer", async () => {
    setup();
    seedLibrary(USER_ID, { IN_PROGRESS: [112], WATCHED: [111] });
    seedWatched(USER_ID, 112, episodes(1, 1, 2));
    onTmdb('/tv/111', {}, { status: 500 });
    onTmdb('/tv/112', {}, { status: 500 });

    const response = await states([111, 112, WATCHING]);

    expect(response.status).toBe(200);
    const { states: byId } = await body(response);
    expect(byId[111]).toEqual({ onWatchlist: false, state: 'finished' });
    expect(byId[112]).toEqual({ onWatchlist: false, state: 'watching' });
    expect(byId[WATCHING]).toMatchObject({ state: 'watching' });
  });

  it('collapses duplicate ids', async () => {
    setup();

    const { states: byId } = await body(
      await states([WATCHLIST, WATCHLIST, NEW]),
    );

    expect(Object.keys(byId).sort()).toEqual([String(NEW), String(WATCHLIST)]);
  });

  it(`takes up to ${SERIES_STATES_MAX_IDS} ids`, async () => {
    setup();
    const ids = Array.from({ length: SERIES_STATES_MAX_IDS }, (_, i) => i + 1);

    const response = await states(ids);

    expect(response.status).toBe(200);
    expect(Object.keys((await body(response)).states)).toHaveLength(
      SERIES_STATES_MAX_IDS,
    );
  });

  it.each([
    ['more than 60 ids', Array.from({ length: 61 }, (_, i) => i + 1).join(',')],
    ['a non-numeric id', '1,abc'],
    ['an empty list', ''],
    ['an empty id', '1,,2'],
    ['a zero id', '0'],
    ['a negative id', '-5'],
    ['an id of more than 10 digits', '12345678901'],
  ])('rejects %s with a 400', async (_, ids) => {
    seedUser();
    resetRequests();

    const response = await states(ids);

    expect(response.status).toBe(400);
    expect(requestedUrls()).toEqual([]);
  });

  it('rejects a request without ids with a 400', async () => {
    seedUser();
    expect((await request('/me/series-states', { as: USER_ID })).status).toBe(
      400,
    );
  });
});

describe('GET /me/series-states: reads', () => {
  const NEW_IDS = Array.from({ length: 18 }, (_, i) => 1001 + i);
  const PAGE = [
    ...NEW_IDS,
    WATCHLIST,
    201,
    202,
    203,
    WATCHING,
    WATCHLIST_AND_WATCHING,
    BETWEEN_SEASONS,
    ENDED,
    RENEWED,
  ];

  const pageSetup = async () => {
    setup();
    seedLibrary(USER_ID, { WATCHLIST: [201, 202, 203] });
    // The nightly job has built the per-show summaries
    await buildRollups(
      USER_ID,
      new Map(
        [WATCHING, WATCHLIST_AND_WATCHING].map((id) => [
          id,
          {
            items: (
              db.dump('Watched') as Array<{
                episodeNumber: number;
                pk: string;
                seasonNumber: number;
                seriesId: number;
                watchedAt: number;
              }>
            ).filter(
              (item) => item.seriesId === id && item.pk === `USER#${USER_ID}`,
            ),
          },
        ]),
      ),
      Date.now(),
    );
    // A first view stores the shows' facts (shared by every user)
    await states(PAGE);
  };

  const readsOf = (table: string) =>
    db.calls.filter(
      (command) =>
        (command instanceof QueryCommand ||
          command instanceof BatchGetItemCommand) &&
        JSON.stringify(command.input).includes(`"${table}"`),
    );

  it('answers 27 ids, 2 of them in progress, in 3 rounds: the user, the lists, then facts, prefs and summaries side by side', async () => {
    await pageSetup();
    expect(PAGE).toHaveLength(27);
    db.calls.length = 0;
    resetRequests();

    const { result, rounds } = await measureRounds(() => states(PAGE));

    expect(result.status).toBe(200);
    expect(Object.keys((await body(result)).states)).toHaveLength(27);
    // 1: the token's user (auth); 2: the viewer's list ids (one keys-only
    // Query); 3: the 5 progress shows' facts, the 2 in-progress shows' prefs
    // and summaries, three batch reads at once
    expect(rounds).toBe(3);
    expect(readsOf('Lists').map((command) => command.constructor.name)).toEqual(
      ['QueryCommand', 'BatchGetItemCommand', 'BatchGetItemCommand'],
    );
    expect(readsOf('Cache')).toHaveLength(1);
    expect(readsOf('Watched')).toEqual([]);
    expect(requestedUrls()).toEqual([]);
  });

  it('reads only the lists for ids that are new or on the watchlist', async () => {
    await pageSetup();
    db.calls.length = 0;

    const { rounds } = await measureRounds(() =>
      states([...NEW_IDS, WATCHLIST, 201]),
    );

    expect(rounds).toBe(2);
    expect(readsOf('Lists')).toHaveLength(1);
    expect(readsOf('Cache')).toEqual([]);
    expect(readsOf('Watched')).toEqual([]);
  });
});
