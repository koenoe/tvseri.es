import { CirclePeopleSchema } from '@tvseri.es/schemas';
import * as v from 'valibot';
import { describe, expect, it } from 'vitest';

import { db } from './db';
import { seedLibrary } from './library';
import { measureReads } from './readUnits';
import { request } from './request';
import { seedUser, USER_ID } from './seed';

const ME = USER_ID;
const id = (name: string) => `01JUSER${name.toUpperCase().padEnd(19, 'X')}`;

/** A follow item as `follow()` writes it, at a given moment */
const seedFollow = (from: string, to: string, at: number) =>
  db.seed('Follow', [
    {
      createdAt: at,
      followerId: from,
      followingId: to,
      gsi1pk: `USER#${to}#FOLLOWERS`,
      gsi1sk: `${at}#${from}`,
      gsi2pk: `USER#${from}#FOLLOWING`,
      gsi2sk: `${at}#${to}`,
      pk: `FOLLOW#${from}#${to}`,
      sk: `FOLLOW#${from}#${to}`,
    },
  ]);

const person = (name: string, extra: Record<string, unknown> = {}) =>
  seedUser({ id: id(name), username: name, ...extra });

const MY_LIBRARY = {
  FAVORITES: [1, 2, 3],
  IN_PROGRESS: [20, 21],
  WATCHED: [1, 2, 3, 4, 5, 6, 7, 8],
  WATCHLIST: [30],
};

/**
 * I follow close and twin (same score: by username), mid (lower), few
 * (under 5 shared: no level), gone (deletion pending, never listed);
 * fan and close follow me; I don't follow fan back.
 */
const setup = () => {
  seedUser({ followerCount: 2, followingCount: 5, id: ME, username: 'me' });
  person('close');
  person('twin');
  person('mid');
  person('few');
  person('fan');
  person('gone', { deletionRequestedAt: 1 });
  seedLibrary(ME, MY_LIBRARY);
  seedLibrary(id('close'), {
    FAVORITES: [1, 2, 3],
    IN_PROGRESS: [40, 41],
    WATCHED: [1, 2, 3, 4, 5, 6, 7, 8],
  });
  seedLibrary(id('twin'), {
    FAVORITES: [1, 2, 3],
    WATCHED: [1, 2, 3, 4, 5, 6, 7, 8],
  });
  seedLibrary(id('mid'), { WATCHED: [1, 2, 3, 4, 5, 20] });
  seedLibrary(id('few'), { IN_PROGRESS: [42], WATCHED: [1, 30] });
  seedLibrary(id('fan'), { IN_PROGRESS: [43] });
  // close's most recent In progress show (40) is hidden
  db.seed('Lists', [
    {
      paused: 'hide',
      pausedAt: 5,
      pk: `USER#${id('close')}`,
      sk: 'PREF#SERIES#40',
    },
  ]);
  ['few', 'mid', 'twin', 'close', 'gone'].forEach((name, index) => {
    seedFollow(ME, id(name), 1000 + index);
  });
  seedFollow(id('close'), ME, 2000);
  seedFollow(id('fan'), ME, 2001);
};

const circle = async (as = ME) => {
  const response = await request('/me/circle/people', { as });
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  return v.parse(CirclePeopleSchema, await response.json());
};

describe('GET /me/circle/people', () => {
  it('ranks follows by match, no level last; followers not followed back after', async () => {
    setup();
    const people = await circle();
    expect(people.following.map((row) => row.username)).toEqual([
      'close',
      'twin',
      'mid',
      'few',
    ]);
    expect(people.following[0]).toEqual({
      following: true,
      followsYou: true,
      id: id('close'),
      match: {
        // 3 both-favourite × 3 + 5 both-finished × 2 = 19: low
        arc: 30,
        level: 'low',
        sharedCount: 8,
        sharedShows: [
          { id: 1, relation: 'both-favourite', title: 'Show 1' },
          { id: 2, relation: 'both-favourite', title: 'Show 2' },
          { id: 3, relation: 'both-favourite', title: 'Show 3' },
        ],
      },
      username: 'close',
      // 40 is newer but hidden
      watching: { seriesId: 41, slug: 'show-41', title: 'Show 41' },
    });
    expect(people.following[3]?.match.level).toBeNull();
    expect(people.following[3]?.watching?.seriesId).toBe(42);
    expect(people.following[1]?.watching).toBeNull();
    expect(
      people.followers.map((row) => [row.username, row.following]),
    ).toEqual([['fan', false]]);
    expect(people.followers[0]?.followsYou).toBe(true);
    expect(people.capped).toBe(false);
    expect(people.followingCount).toBe(5);
    expect(people.followerCount).toBe(2);
  });

  it('matches /user/:id/match for the same pair', async () => {
    setup();
    const people = await circle();
    const response = await request(`/user/${id('mid')}/match`, { as: ME });
    const { match } = (await response.json()) as {
      match: { level: string | null; arc: number; sharedCount: number };
    };
    const row = people.following.find((entry) => entry.username === 'mid')!;
    expect(row.match).toMatchObject({
      arc: match.arc,
      level: match.level,
      sharedCount: match.sharedCount,
    });
  });

  it('follows nobody: empty lists, the counts kept', async () => {
    seedUser({ followerCount: 0, followingCount: 3, id: ME });
    const people = await circle();
    expect(people).toEqual({
      capped: false,
      followerCount: 0,
      followers: [],
      following: [],
      followingCount: 3,
    });
  });

  it('is signed-in only and uses the token user', async () => {
    setup();
    expect((await request('/me/circle/people')).status).toBe(401);
    const fan = await circle(id('fan'));
    expect(fan.following.map((row) => row.username)).toEqual(['me']);
    expect(fan.following[0]?.followsYou).toBe(false);
  });

  it('caps at 100 rows, following first', async () => {
    seedUser({ id: ME });
    for (let index = 0; index < 105; index++) {
      const name = `p${String(index).padStart(3, '0')}`;
      person(name);
      seedFollow(ME, id(name), 1000 + index);
    }
    person('fan');
    seedFollow(id('fan'), ME, 5000);
    const people = await circle();
    expect(people.following).toHaveLength(100);
    expect(people.followers).toEqual([]);
    expect(people.capped).toBe(true);
    // the most recent follows
    expect(people.following.some((row) => row.username === 'p104')).toBe(true);
    expect(people.following.some((row) => row.username === 'p000')).toBe(false);
  });

  it('reads one library per person (measured)', async () => {
    setup();
    const { report } = await measureReads(() =>
      request('/me/circle/people', { as: ME }),
    );
    console.info('circle reads per view', JSON.stringify(report));
    // 2 follow Queries + my library (2) + 5 people × 2, one users BatchGet each list
    expect(report.commands.QueryCommand).toBe(2 + 2 + 5 * 2);
    expect(report.commands.BatchGetItemCommand).toBe(2);
    expect(report.rru.Watched ?? 0).toBe(0);
  });

  it('8 follows and 2 followers with 300-show libraries (measured)', async () => {
    const big = (offset: number) => ({
      FAVORITES: Array.from({ length: 90 }, (_, i) => offset + i),
      IN_PROGRESS: Array.from({ length: 60 }, (_, i) => offset + 300 + i),
      WATCHED: Array.from({ length: 200 }, (_, i) => offset + i),
      WATCHLIST: Array.from({ length: 40 }, (_, i) => offset + 400 + i),
    });
    seedUser({ id: ME });
    seedLibrary(ME, big(0));
    for (let index = 0; index < 10; index++) {
      const name = `big${index}`;
      person(name);
      seedLibrary(id(name), big(index * 20));
      if (index < 8) {
        seedFollow(ME, id(name), 1000 + index);
      } else {
        seedFollow(id(name), ME, 1000 + index);
      }
    }
    const { report, result } = await measureReads(() =>
      request('/me/circle/people', { as: ME }),
    );
    expect(result.status).toBe(200);
    console.info('circle reads, 8 + 2 people', JSON.stringify(report));
    expect(report.commands.QueryCommand).toBe(2 + 2 + 10 * 2);
    expect(report.totalRru).toBeLessThanOrEqual(150);
  });
});
