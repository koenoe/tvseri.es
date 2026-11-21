import { describe, expect, it } from 'vitest';

import { db } from './db';
import { onTmdb } from './fakeHttp';
import { fakeShow } from './fixtures/tmdb';
import { seedWatched } from './library';
import { request } from './request';
import { seedUser, USER_ID } from './seed';

/**
 * Scope marks and unmarks of a show that can't be marked: one TMDB doesn't
 * have, or one that hasn't started airing. A 404 that writes and deletes
 * nothing; a bad body is refused before the show is looked up.
 */

// Module caches keep TMDB series between tests: one show id per test
let nextShow = 7900;

const unknownShow = () => {
  nextShow += 1;
  onTmdb(`/tv/${nextShow}`, { status_message: 'nope' }, { status: 404 });
  return nextShow;
};

const unairedShow = () => {
  nextShow += 1;
  fakeShow({
    id: nextShow,
    seasons: [{ airDate: '2099-01-01', aired: 0, episodes: 2 }],
  });
  return nextShow;
};

const NOT_FOUND = { message: 'Not Found', status: 404 };

const send = (method: string, path: string, body?: unknown) =>
  request(`/user/${USER_ID}${path}`, { as: USER_ID, body, method });

/** Rows that must survive: a watched episode of the show itself */
const seedRows = (show: number) => {
  seedUser();
  seedWatched(USER_ID, show, [[1, 1]]);
  return db.dump('Watched');
};

const MARK_BODY = { watchedAt: Date.UTC(2025, 0, 1), watchProvider: null };

describe.each([
  ['TMDB does not have', unknownShow],
  ['has not started airing', unairedShow],
])('a show %s', (_, newShow) => {
  it.each([
    ['POST', '', MARK_BODY],
    ['POST', '/season/1', MARK_BODY],
    ['DELETE', '', undefined],
    ['DELETE', '/season/1', undefined],
  ])(
    '%s /watched/series/:id%s is a 404 that changes nothing',
    async (method, scope, body) => {
      const show = newShow();
      const before = seedRows(show);
      const lists = db.dump('Lists');

      const response = await send(
        method,
        `/watched/series/${show}${scope}`,
        body,
      );

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual(NOT_FOUND);
      expect(db.dump('Watched')).toEqual(before);
      expect(db.dump('Lists')).toEqual(lists);
    },
  );
});

describe('a bad body for a show TMDB does not have', () => {
  it.each(['', '/season/1'])(
    'POST /watched/series/:id%s is refused as a bad request first',
    async (scope) => {
      const show = unknownShow();
      const before = seedRows(show);

      const response = await send('POST', `/watched/series/${show}${scope}`, {
        watchedAt: 'yesterday',
      });

      expect(response.status).toBe(400);
      // The validator's answer (its issue list is Valibot's), never a 404
      expect(await response.json()).toMatchObject({
        issues: expect.arrayContaining([
          expect.objectContaining({ input: 'yesterday', kind: 'schema' }),
        ]),
        success: false,
      });
      expect(db.dump('Watched')).toEqual(before);
    },
  );
});
