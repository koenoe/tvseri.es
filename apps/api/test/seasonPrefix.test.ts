import { describe, expect, it } from 'vitest';

import { db } from './db';
import { fakeShow } from './fixtures/tmdb';
import { request } from './request';
import { seedUser, USER_ID } from './seed';

const SHOW = 4343;

/**
 * A season's watched items are read by the `S<season>` prefix of their
 * index sort key (`S100#E001`). A four-digit season a Plex scrobble can
 * write (`S1000#E001`) starts with the same characters as season 100.
 */
describe('one season of a show', () => {
  it('is never confused with a season whose number starts with the same digits', async () => {
    seedUser();
    fakeShow({
      id: SHOW,
      seasons: Array.from({ length: 100 }, () => ({
        airDate: '2020-01-01',
        episodes: 2,
      })),
    });
    db.seed('Watched', [
      {
        episodeNumber: 1,
        gsi1pk: `USER#${USER_ID}#SERIES#${SHOW}`,
        gsi1sk: 'S1000#E001',
        pk: `USER#${USER_ID}`,
        seasonNumber: 1000,
        seriesId: SHOW,
        sk: `SERIES#${SHOW}#S1000#E001`,
        userId: USER_ID,
        watchedAt: 1,
      },
    ]);

    const response = await request(
      `/user/${USER_ID}/watched/series/${SHOW}/season/100`,
      { as: USER_ID, body: { watchProvider: null }, method: 'POST' },
    );

    expect(response.status).toBe(201);
    const keys = db
      .dump('Watched')
      .map((item) => String(item.sk))
      .sort();
    expect(keys).toEqual([
      `SERIES#${SHOW}#S100#E001`,
      `SERIES#${SHOW}#S100#E002`,
      `SERIES#${SHOW}#S1000#E001`,
    ]);
  });
});
