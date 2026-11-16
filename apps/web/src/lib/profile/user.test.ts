import type { User } from '@tvseri.es/schemas';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The API's CDN as the web meets it: the lookup's answers (a 404 too) are
 * kept per URL, path plus query, and the web's server fetch sends no
 * `Origin`. Writes go to the origin only; nothing here expires a copy.
 */
const { cdn } = vi.hoisted(() => {
  const origin = new Map<string, Partial<User>>();
  const kept = new Map<string, { status: number; body: string }>();
  return {
    cdn: {
      fetch: (url: string) => {
        const { pathname } = new URL(url);
        const name = decodeURIComponent(pathname.split('/').pop() ?? '');
        const copy = kept.get(url) ?? {
          body: JSON.stringify(origin.get(name) ?? { message: 'Not Found' }),
          status: origin.has(name) ? 200 : 404,
        };
        kept.set(url, copy);
        return Promise.resolve(
          new Response(copy.body, {
            headers: { 'content-type': 'application/json' },
            status: copy.status,
          }),
        );
      },
      kept,
      origin,
    },
  };
});

vi.mock('@/lib/api/client', async (importOriginal) => {
  const client = await importOriginal<typeof import('@/lib/api/client')>();
  return {
    ...client,
    ...client.createApiClient({
      config: () => ({ apiKey: 'test', baseUrl: 'https://api.test' }),
      dedupe: (send) => send,
      fetch: (input) => cdn.fetch(String(input)),
    }),
  };
});

const { loadProfileUser, lookupUsernameOwner, resolveProfileUser } =
  await import('./user');

const rae: User = {
  createdAt: '2024-11-08T10:00:00.000Z',
  email: 'rae@example.com',
  id: 'u-rae',
  role: 'user',
  username: 'rae',
  version: 1,
  watchProviders: [],
};

const netflix = {
  id: 8,
  logo: 'https://img/n.png',
  logoPath: '/n.png',
  name: 'Netflix',
};

/** The API after `PUT /me`: the origin answers the new state at once */
const save = (user: User, previous?: string) => {
  if (previous) {
    cdn.origin.delete(previous);
  }
  cdn.origin.set(user.username, user);
};

beforeEach(() => {
  cdn.origin.clear();
  cdn.kept.clear();
  save(rae);
});

describe('a rename', () => {
  it('works on the new name at once, though the availability check asked for it while it was free', async () => {
    // Settings: typing "rae-fox" asks whether it is free (a cached 404)
    await expect(lookupUsernameOwner('rae-fox')).resolves.toBeNull();

    const renamed = { ...rae, username: 'rae-fox' };
    save(renamed, 'rae');

    // anyone, signed in or out, opening the new profile
    await expect(loadProfileUser('rae-fox')).resolves.toMatchObject({
      id: 'u-rae',
      username: 'rae-fox',
    });
  });

  it('gives the owner their new name and drops the old one for them at once, whatever the CDN still holds', async () => {
    // a visitor opened both names before the rename: the CDN holds the old
    // name's profile and a 404 for the new one
    await loadProfileUser('rae');
    await loadProfileUser('rae-fox');
    const renamed = { ...rae, username: 'rae-fox' };
    save(renamed, 'rae');
    const ownAccount = () => Promise.resolve(renamed);

    await expect(
      resolveProfileUser('rae-fox', 'u-rae', ownAccount),
    ).resolves.toEqual({
      isOwner: true,
      user: expect.objectContaining({ username: 'rae-fox' }),
    });
    await expect(
      resolveProfileUser('rae', 'u-rae', ownAccount),
    ).resolves.toBeNull();
  });
});

describe('the availability check', () => {
  it('finds who has a name, on its own CDN key', async () => {
    await expect(lookupUsernameOwner('rae')).resolves.toBe('u-rae');
    expect([...cdn.kept.keys()]).toEqual([
      'https://api.test/user/by-username/rae?purpose=check',
    ]);
  });
});

describe('the owner’s services', () => {
  it('show a change on their own profile at once; a visitor gets the shared copy', async () => {
    await loadProfileUser('rae');
    save({ ...rae, watchProviders: [netflix] });
    const ownAccount = () =>
      Promise.resolve({ ...rae, watchProviders: [netflix] });

    const own = await resolveProfileUser('rae', 'u-rae', ownAccount);
    expect(own?.user.watchProviders).toEqual([netflix]);

    const loadOwnUser = vi.fn(() => Promise.resolve(null));
    const visitor = await resolveProfileUser('rae', 'u-kit', loadOwnUser);
    expect(visitor).toEqual({
      isOwner: false,
      user: expect.objectContaining({ watchProviders: [] }),
    });
    // a visitor's view costs no `GET /me`
    expect(loadOwnUser).not.toHaveBeenCalled();
  });

  it('fall back to the shared copy when the owner’s account can’t be read', async () => {
    const own = await resolveProfileUser('rae', 'u-rae', () =>
      Promise.resolve(null),
    );
    expect(own).toEqual({
      isOwner: true,
      user: expect.objectContaining({ id: 'u-rae' }),
    });
  });
});

describe('an unknown username', () => {
  it('is null for a signed-in visitor too', async () => {
    await expect(
      resolveProfileUser('nobody', 'u-kit', () =>
        Promise.resolve({ ...rae, id: 'u-kit', username: 'kit' }),
      ),
    ).resolves.toBeNull();
  });
});
