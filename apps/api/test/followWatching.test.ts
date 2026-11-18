import { WatchingNowSchema } from '@tvseri.es/schemas';
import * as v from 'valibot';
import { describe, expect, it } from 'vitest';

import { db } from './db';
import { listItem } from './library';
import { measureReads } from './readUnits';
import { request } from './request';
import { OTHER_USER_ID, seedUser, USER_ID } from './seed';

const OWNER = USER_ID;
const VIEWER = OTHER_USER_ID;
const id = (name: string) => `01JUSER${name.toUpperCase().padEnd(19, 'X')}`;

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

const hidden = (userId: string, seriesId: number) => ({
  paused: 'hide',
  pausedAt: 1,
  pk: `USER#${userId}`,
  sk: `PREF#SERIES#${seriesId}`,
});

/** The owner follows watcher (in progress), hider (latest hidden), idle (nothing) and all-hidden (5 hidden) */
const setup = () => {
  seedUser({ id: OWNER });
  seedUser({ id: VIEWER });
  for (const name of ['watcher', 'hider', 'idle', 'allhidden']) {
    seedUser({ id: id(name), username: name });
  }
  db.seed('Lists', [
    listItem(id('watcher'), 'IN_PROGRESS', 1, 100),
    listItem(id('watcher'), 'IN_PROGRESS', 2, 200),
    listItem(id('hider'), 'IN_PROGRESS', 3, 100),
    listItem(id('hider'), 'IN_PROGRESS', 4, 300),
    hidden(id('hider'), 4),
    listItem(id('idle'), 'WATCHED', 5, 100),
    ...[6, 7, 8, 9, 10, 11].map((show, index) =>
      listItem(id('allhidden'), 'IN_PROGRESS', show, 1000 - index),
    ),
    ...[6, 7, 8, 9, 10].map((show) => hidden(id('allhidden'), show)),
  ]);
  ['watcher', 'hider', 'idle', 'allhidden'].forEach((name, index) => {
    seedFollow(OWNER, id(name), 10 + index);
  });
  seedFollow(id('watcher'), OWNER, 50);
};

const page = async (path: string) => {
  const response = await request(path, { as: VIEWER });
  expect(response.status).toBe(200);
  return (await response.json()) as {
    items: Array<{ username: string; watching?: unknown }>;
  };
};

describe('?include=watching on the follow lists', () => {
  it('adds what each person is watching, hidden shows skipped', async () => {
    setup();
    const { items } = await page(
      `/user/${OWNER}/following?include=watching&limit=24`,
    );
    const byName = Object.fromEntries(
      items.map((item) => [item.username, item.watching]),
    );
    expect(byName).toEqual({
      // all five most recent are hidden: the API stops there
      allhidden: null,
      hider: { seriesId: 3, slug: 'show-3', title: 'Show 3' },
      idle: null,
      watcher: { seriesId: 2, slug: 'show-2', title: 'Show 2' },
    });
    for (const watching of Object.values(byName)) {
      if (watching) {
        v.parse(WatchingNowSchema, watching);
      }
    }
    const followers = await page(`/user/${OWNER}/followers?include=watching`);
    expect(followers.items.map((item) => item.watching)).toEqual([
      { seriesId: 2, slug: 'show-2', title: 'Show 2' },
    ]);
  });

  it('leaves the answer as it was without include', async () => {
    setup();
    const { items } = await page(`/user/${OWNER}/following`);
    expect(items.every((item) => !('watching' in item))).toBe(true);
  });

  it('400s a limit above 24 or another include', async () => {
    setup();
    for (const query of [
      'include=watching&limit=25',
      'include=facts',
      'include=watching&limit=100',
    ]) {
      const response = await request(`/user/${OWNER}/following?${query}`, {
        as: VIEWER,
      });
      expect(response.status).toBe(400);
    }
    expect(
      (await request(`/user/${OWNER}/following?limit=100`, { as: VIEWER }))
        .status,
    ).toBe(200);
  });

  it('costs a Query and a BatchGetItem per row (measured)', async () => {
    setup();
    const { report } = await measureReads(() =>
      request(`/user/${OWNER}/following?include=watching&limit=24`, {
        as: VIEWER,
      }),
    );
    console.info('following include=watching reads', JSON.stringify(report));
    // the follow Query + one gsi2 Query per row; prefs BatchGets for rows with items
    expect(report.commands.QueryCommand).toBe(1 + 4);
    expect(report.rru.Lists).toBeLessThanOrEqual(4 * 1.5);
  });
});
