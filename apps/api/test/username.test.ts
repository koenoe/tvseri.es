import type { User } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { updateUser } from '@/lib/db/user';

import { db } from './db';
import { request } from './request';
import { OTHER_USER_ID, seedUser, USER_ID } from './seed';

const rename = (as: string, username: string) =>
  request('/me', { as, body: { username }, method: 'PUT' });

const claims = () =>
  db
    .dump('Users')
    .filter((item) => String(item.pk).startsWith('HANDLE#'))
    .map((item) => [item.pk, item.userId]);

describe('usernames are unique', () => {
  it('gives a name two people pick at the same moment to one of them', async () => {
    seedUser({ username: 'wren' });
    seedUser({ id: OTHER_USER_ID, username: 'other' });

    const responses = await Promise.all([
      rename(USER_ID, 'robin'),
      rename(OTHER_USER_ID, 'robin'),
    ]);

    expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
    const named = db.dump('Users').filter((item) => item.username === 'robin');
    expect(named).toHaveLength(1);
    expect(claims()).toContainEqual(['HANDLE#robin', named[0]?.id]);
  });

  it('frees the old name: another user can take it next', async () => {
    seedUser({ username: 'wren' });
    seedUser({ id: OTHER_USER_ID, username: 'other' });
    db.seed('Users', [{ pk: 'HANDLE#wren', userId: USER_ID }]);

    expect((await rename(USER_ID, 'robin')).status).toBe(200);
    expect((await rename(OTHER_USER_ID, 'wren')).status).toBe(200);
    expect(claims().sort()).toEqual([
      ['HANDLE#robin', USER_ID],
      ['HANDLE#wren', OTHER_USER_ID],
    ]);
  });

  it('refuses a name another user holds', async () => {
    seedUser({ username: 'wren' });
    seedUser({ id: OTHER_USER_ID, username: 'other' });
    expect((await rename(USER_ID, 'other')).status).toBe(409);
  });
});

describe('a profile update never creates a user', () => {
  // The account was deleted while the request was on its way (the auth
  // check had passed): nothing may write a new, partial user item
  it.each([
    ['a name', { name: 'Wren' }],
    ['a country', { country: 'NL' }],
    ['a username', { username: 'robin' }],
  ])('with %s, for a user who is gone', async (_, updates) => {
    const user = seedUser({ username: 'wren' });
    db.reset();

    await expect(
      updateUser(
        { createdAt: user.createdAt, id: USER_ID, username: 'wren' } as User,
        updates,
      ),
    ).rejects.toThrow();
    expect(db.dump('Users')).toEqual([]);
  });
});
