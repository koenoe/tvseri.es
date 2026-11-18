import { emailKey, userKey, usernameKey } from '@tvseri.es/utils';

import { db } from './db';

export const USER_ID = '01JUSERAAAAAAAAAAAAAAAAAAA';
export const OTHER_USER_ID = '01JUSERBBBBBBBBBBBBBBBBBBB';

/** Seeds a user item as the auth service writes it */
export const seedUser = (
  overrides: Readonly<Record<string, unknown>> & { id?: string } = {},
) => {
  const id = overrides.id ?? USER_ID;
  const username =
    (overrides.username as string | undefined) ??
    `user-${id.slice(-4).toLowerCase()}`;
  const email = `${username}@example.com`;
  const user = {
    createdAt: '2025-01-01T00:00:00.000Z',
    email,
    gsi1pk: emailKey(email),
    gsi2pk: usernameKey(username),
    id,
    pk: userKey(id),
    role: 'user',
    username,
    version: 1,
    ...overrides,
  };
  db.seed('Users', [user]);
  return user;
};
