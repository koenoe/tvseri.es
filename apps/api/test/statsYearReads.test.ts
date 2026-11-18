import { describe, expect, it } from 'vitest';

import { db } from './db';
import { episodes, seedLibrary, seedWatched } from './library';
import { measureRounds } from './readRounds';
import { request } from './request';
import { seedUser, USER_ID } from './seed';

const YEAR = new Date().getUTCFullYear();

/** Reads of the Users table since the last reset of the calls */
const userReads = () =>
  db.calls.filter(
    (command) =>
      (command.input as { TableName?: string }).TableName === 'Users' &&
      /Get|Query/.test(command.constructor.name),
  ).length;

/** One segment computed on a cache miss: its user reads and its rounds */
const segment = async (name: string) => {
  db.calls.length = 0;
  const { result, rounds } = await measureRounds(() =>
    request(`/user/${USER_ID}/stats/${YEAR}/${name}`),
  );
  expect(result.status).toBe(200);
  return { rounds, users: userReads() };
};

describe('a year segment on a cache miss', () => {
  const setup = () => {
    seedUser({ country: 'US' });
    seedLibrary(USER_ID, { WATCHED: [1] });
    seedWatched(USER_ID, 1, episodes(1, 1, 3), `${YEAR}-01-10T20:00:00Z`);
  };

  it('reads the user once, for the route, also where it counts in their zone', async () => {
    setup();
    const weekly = await segment('weekly');
    for (const name of ['when', 'daily', 'new-or-back']) {
      expect({ name, users: (await segment(name)).users }).toEqual({
        name,
        users: weekly.users,
      });
    }
  });

  it('reads the finished shows beside the year, not after it', async () => {
    setup();
    const weekly = await segment('weekly');
    const finished = await segment('finished');
    expect(finished.rounds).toBe(weekly.rounds);
  });
});
