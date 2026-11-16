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
  const user = {
    createdAt: '2025-01-01T00:00:00.000Z',
    email: `${username}@example.com`,
    gsi1pk: `EMAIL#${username}`,
    gsi2pk: `USERNAME#${username}`,
    id,
    pk: `USER#${id}`,
    role: 'user',
    username,
    version: 1,
    ...overrides,
  };
  db.seed('Users', [user]);
  return user;
};
