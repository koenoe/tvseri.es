import { describe, expect, it } from 'vitest';

import { db } from './db';
import { listItem } from './library';
import { request } from './request';
import { seedUser, USER_ID } from './seed';

const YEAR = 2025;
const at = (iso: string) => Date.parse(iso);

describe('GET /user/:id/stats/:year/favorites-count', () => {
  it('counts the favourites added in the year and the year before, and keeps them for the day', async () => {
    seedUser();
    db.seed('Lists', [
      listItem(USER_ID, 'FAVORITES', 1, at('2025-03-01T10:00:00Z')),
      listItem(USER_ID, 'FAVORITES', 2, at('2025-12-31T23:00:00Z')),
      listItem(USER_ID, 'FAVORITES', 3, at('2024-06-01T10:00:00Z')),
      listItem(USER_ID, 'FAVORITES', 4, at('2026-01-01T00:00:00Z')),
    ]);

    const path = `/user/${USER_ID}/stats/${YEAR}/favorites-count`;
    const response = await request(path);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ current: 2, previous: 1 });

    db.calls.length = 0;
    expect(await (await request(path)).json()).toEqual({
      current: 2,
      previous: 1,
    });
    const listReads = db.calls.filter(
      (command) =>
        (command.input as { TableName?: string }).TableName === 'Lists',
    );
    expect(listReads).toEqual([]);
  });
});
