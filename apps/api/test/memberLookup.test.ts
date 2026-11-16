import { describe, expect, it } from 'vitest';

import { request } from './request';
import { OTHER_USER_ID, seedUser, USER_ID } from './seed';

const lookup = (username: string, as: string | null = USER_ID) =>
  request(`/me/member?username=${encodeURIComponent(username)}`, {
    as: as ?? undefined,
  });

const setup = () => {
  seedUser();
  seedUser({ id: OTHER_USER_ID, name: 'Juno Example', username: 'juno-tv' });
};

describe('exact-handle member lookup (search)', () => {
  it('needs a signed-in viewer', async () => {
    setup();
    const response = await lookup('juno-tv', null);
    expect(response.status).toBe(401);
  });

  it('finds a member by their exact handle, with id and username only, never stored by a shared cache', async () => {
    setup();
    const response = await lookup('juno-tv');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      id: OTHER_USER_ID,
      username: 'juno-tv',
    });
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });

  it.each(['@juno-tv', 'Juno-TV', '  @JUNO-tv '])(
    'takes %j the way usernames are stored',
    async (typed) => {
      setup();
      const response = await lookup(typed);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        id: OTHER_USER_ID,
        username: 'juno-tv',
      });
    },
  );

  it.each(['juno', 'juno-t', 'juno-tvx', 'Juno Example'])(
    'is exact: %j finds nobody',
    async (typed) => {
      setup();
      const response = await lookup(typed);
      // a valid handle that isn't one: 404; a name with a space: 400
      expect([404, 400]).toContain(response.status);
    },
  );

  it('is 404 for a member whose account is being deleted', async () => {
    setup();
    seedUser({
      deletionRequestedAt: Date.now(),
      id: OTHER_USER_ID,
      username: 'juno-tv',
    });
    const response = await lookup('juno-tv');
    expect(response.status).toBe(404);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });

  it.each([
    ['', 'empty'],
    ['@', 'a bare @'],
    ['@jo', 'shorter than any username'],
    ['a'.repeat(31), 'past the 30-character cap'],
    ['juno_tv', 'not a handle'],
    ['juno--tv', 'not a handle'],
  ])('is 400 for %j (%s)', async (typed) => {
    setup();
    expect((await lookup(typed)).status).toBe(400);
  });

  it('is 400 without a username', async () => {
    setup();
    const response = await request('/me/member', { as: USER_ID });
    expect(response.status).toBe(400);
  });
});
