import type { User } from '@tvseri.es/schemas';

/** `e2e/stub-api/issuer.ts` */
export const ISSUER_PORT = 3134;

export type Viewer = Readonly<{ key: 'member' | 'new'; user: User }>;

const DAY_MS = 86_400_000;

/**
 * The stub's invented signed-in people: a member of long standing (the
 * signed-in demo) and a new user (Get started).
 */
export const VIEWERS: ReadonlyArray<Viewer> = [
  {
    key: 'member',
    user: {
      country: 'GB',
      createdAt: '2024-03-02T10:00:00.000Z',
      email: 'nina@example.com',
      id: 'stub-user-nina',
      name: 'Nina',
      role: 'user',
      username: 'nina',
      version: 1,
    },
  },
  {
    key: 'new',
    user: {
      country: 'GB',
      createdAt: new Date(Date.now() - 2 * DAY_MS).toISOString(),
      email: 'sam@example.com',
      id: 'stub-user-sam',
      name: 'Sam',
      role: 'user',
      username: 'sam',
      version: 1,
    },
  },
];

/** The token's viewer (the stub doesn't verify the signature) */
export function viewerFromAuthorization(
  authorization: string | undefined,
): Viewer | undefined {
  const token = authorization?.replace(/^Bearer /, '') ?? '';
  try {
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8'),
    ) as { properties?: { id?: string } };
    return VIEWERS.find((item) => item.user.id === payload.properties?.id);
  } catch {
    return undefined;
  }
}
