import { issuer } from '@openauthjs/openauth';
import { MemoryStorage } from '@openauthjs/openauth/storage/memory';
import type { StorageAdapter } from '@openauthjs/openauth/storage/storage';
import { Storage } from '@openauthjs/openauth/storage/storage';
import { type Role, subjects } from '@tvseri.es/schemas';
import { describe, expect, it, vi } from 'vitest';

import { createTestApp } from '../testing/testApp';
import { createRefreshProperties } from './refresh';

const USER = { id: '01JUSERAAAAAAAAAAAAAAAAAAA', role: 'user' };
const as = (role: Role) => ({ role });

describe('createRefreshProperties', () => {
  it('keeps the token as it is when the read fails or the user is gone', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const failing = createRefreshProperties(async () => {
      throw new Error('throttled');
    });
    expect(await failing({ properties: USER, type: 'user' })).toBeUndefined();
    const gone = createRefreshProperties(async () => null);
    expect(await gone({ properties: USER, type: 'user' })).toBeUndefined();
  });

  it('reads the user once per refresh, by id', async () => {
    const find = vi.fn(async () => as('user'));
    await createRefreshProperties(find)({ properties: USER, type: 'user' });
    expect(find).toHaveBeenCalledTimes(1);
    expect(find).toHaveBeenCalledWith(USER.id);
  });
});

/** The access token's claims (the signature is the issuer's business) */
const claims = (jwt: string) =>
  JSON.parse(Buffer.from(jwt.split('.')[1]!, 'base64url').toString()) as {
    properties: Record<string, unknown>;
  };

describe('the patched issuer on a refresh_token grant', () => {
  const setup = async (role: Role) => {
    const storage = MemoryStorage();
    const app = issuer({
      allow: async () => true,
      providers: {},
      refresh: createRefreshProperties(async () => as(role)),
      storage,
      subjects,
      success: async () => {
        throw new Error('not used');
      },
    });
    // A refresh token as sign-in stored it, with the sign-in role
    await Storage.set(
      storage,
      ['oauth:refresh', 'user:abc', 'token-1'],
      {
        clientID: 'web',
        properties: USER,
        subject: 'user:abc',
        ttl: { access: 600, refresh: 86_400 },
        type: 'user',
      },
      86_400,
    );
    const refresh = (token: string) =>
      app.request('https://auth.test/token', {
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: token,
        }),
        method: 'POST',
      });
    return { refresh };
  };

  it('puts the role from the database in the new access and refresh tokens', async () => {
    const { refresh } = await setup('admin');
    const first = await refresh('user:abc:token-1');
    expect(first.status).toBe(200);
    const body = (await first.json()) as {
      access_token: string;
      refresh_token: string;
    };
    expect(claims(body.access_token).properties).toEqual({
      ...USER,
      role: 'admin',
    });

    // The next refresh starts from the new properties
    const second = await refresh(body.refresh_token);
    const next = (await second.json()) as { access_token: string };
    expect(claims(next.access_token).properties.role).toBe('admin');
  });

  it('leaves the token as it was when nothing changed', async () => {
    const { refresh } = await setup('user');
    const response = await refresh('user:abc:token-1');
    const body = (await response.json()) as { access_token: string };
    expect(claims(body.access_token).properties).toEqual(USER);
  });
});

/** A refresh token as sign-in stored it, with the sign-in role */
const seedRefreshToken = (storage: StorageAdapter, role: Role) =>
  Storage.set(
    storage,
    ['oauth:refresh', 'user:abc', 'token-1'],
    {
      clientID: 'website',
      properties: { ...USER, role },
      subject: 'user:abc',
      ttl: { access: 600, refresh: 86_400 },
      type: 'user',
    },
    86_400,
  );

describe('the auth app (createApp, as index.ts wires it) on a refresh', () => {
  const refreshWith = async (signedInAs: Role, nowInTable: Role) => {
    const find = vi.fn(async () => as(nowInTable));
    const { app, storage } = createTestApp({
      refresh: createRefreshProperties(find),
    });
    await seedRefreshToken(storage, signedInAs);
    const res = await app.request('https://auth.test/token', {
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: 'user:abc:token-1',
      }),
      method: 'POST',
    });
    expect(res.status).toBe(200);
    expect(find).toHaveBeenCalledWith(USER.id);
    const body = (await res.json()) as { access_token: string };
    return claims(body.access_token).properties.role;
  };

  it('promotes: a user made admin in the table gets admin in the next token', async () => {
    expect(await refreshWith('user', 'admin')).toBe('admin');
  });

  it('demotes: an admin whose role was removed gets user in the next token', async () => {
    expect(await refreshWith('admin', 'user')).toBe('user');
  });

  // A throttled read must not cost the viewer their session or their role
  it('still refreshes, with the role it had, when the user read fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { app, storage } = createTestApp({
      refresh: createRefreshProperties(async () => {
        throw new Error('throttled');
      }),
    });
    await seedRefreshToken(storage, 'admin');
    const res = await app.request('https://auth.test/token', {
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: 'user:abc:token-1',
      }),
      method: 'POST',
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { access_token: string };
    expect(claims(body.access_token).properties.role).toBe('admin');
  });
});
