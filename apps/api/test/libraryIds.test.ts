import { describe, expect, it } from 'vitest';

import { db } from './db';
import { request } from './request';
import { OTHER_USER_ID, seedUser, USER_ID } from './seed';

const listItem = (userId: string, list: string, id: number) => ({
  createdAt: 1,
  gsi2pk: `LIST#${userId}#${list}`,
  gsi2sk: 1,
  id,
  pk: `USER#${userId}`,
  sk: `LIST#${list}#ITEM#${id}`,
  title: `Show ${id}`,
});

describe('GET /me/library-ids', () => {
  it('needs a signed-in user', async () => {
    expect((await request('/me/library-ids')).status).toBe(401);
  });

  it("returns the viewer's show ids per list, prefs and other users left out", async () => {
    seedUser();
    seedUser({ id: OTHER_USER_ID, username: 'other' });
    db.seed('Lists', [
      listItem(USER_ID, 'WATCHED', 1),
      listItem(USER_ID, 'WATCHED', 2),
      listItem(USER_ID, 'RESUMING_SOON', 2),
      listItem(USER_ID, 'IN_PROGRESS', 3),
      listItem(USER_ID, 'WATCHLIST', 4),
      listItem(USER_ID, 'FAVORITES', 1),
      listItem(OTHER_USER_ID, 'WATCHLIST', 9),
      {
        pk: `USER#${USER_ID}`,
        sk: 'PREF#SERIES#5',
        skipped: new Set(['S01E01']),
      },
    ]);

    const response = await request('/me/library-ids', { as: USER_ID });
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await response.json()).toEqual({
      favorites: [1],
      inProgress: [3],
      started: [],
      watched: [1, 2],
      watchlist: [4],
    });
  });

  it('lists every show with a regular episode watched as started, in a list or not', async () => {
    seedUser();
    const rollup = (id: number, codes: number[]) => ({
      asOf: 1,
      c: codes,
      pk: `USER#${USER_ID}`,
      r: codes.map(() => 30),
      sk: `AGG#SHOW#${id}`,
      t: codes.map(() => 1),
    });
    db.seed('Lists', [
      listItem(USER_ID, 'IN_PROGRESS', 3),
      listItem(USER_ID, 'FAVORITES', 7),
      // in progress
      rollup(3, [10_001]),
      // taken out of In progress by hand: watched, in no list
      rollup(7, [10_001, 10_002]),
      // specials only
      rollup(8, [1]),
      // everything unmarked: an empty summary
      rollup(9, []),
      // too many items for a summary
      { asOf: 1, overflow: true, pk: `USER#${USER_ID}`, sk: 'AGG#SHOW#11' },
      { pk: `USER#${USER_ID}`, sk: 'AGG#META', v: 1 },
    ]);

    const ids = (await (
      await request('/me/library-ids', { as: USER_ID })
    ).json()) as { started?: number[] };

    expect(ids.started).toEqual([3, 7, 11]);
  });

  it('lists started shows before the summaries are complete', async () => {
    seedUser();
    db.seed('Lists', [
      {
        asOf: 1,
        c: [10_001],
        pk: `USER#${USER_ID}`,
        r: [30],
        sk: 'AGG#SHOW#7',
        t: [1],
      },
    ]);

    const ids = (await (
      await request('/me/library-ids', { as: USER_ID })
    ).json()) as { started?: number[] };

    expect(ids.started).toEqual([7]);
  });

  it('returns empty lists for a new user', async () => {
    seedUser();
    const response = await request('/me/library-ids', { as: USER_ID });
    expect(await response.json()).toEqual({
      favorites: [],
      inProgress: [],
      started: [],
      watched: [],
      watchlist: [],
    });
  });
});
