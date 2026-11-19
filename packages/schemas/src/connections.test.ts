import * as v from 'valibot';
import { describe, expect, it } from 'vitest';

import { syncTagPrefix } from './connection-service';
import {
  ConnectionCookieSchema,
  ConnectionLinkRequestSchema,
  UnresolvedKeySchema,
} from './connections';
import { isSyncTag } from './watched';

const ID = '0b9c1f9e-2f4b-4c3a-9a51-3f6f5d0c7e21';

describe('sync tags', () => {
  it('names the service', () => {
    expect(syncTagPrefix('netflix')).toBe('netflix-sync:');
  });

  it('accepts every connected service’s tag around a uuid', () => {
    for (const service of ['netflix', 'bbc', 'prime']) {
      expect(isSyncTag(`${service}-sync:${ID}`), service).toBe(true);
    }
  });

  it('refuses an unknown service, a bare prefix and a tag without a uuid', () => {
    expect(isSyncTag(`plex-sync:${ID}`)).toBe(false);
    expect(isSyncTag('netflix-sync:')).toBe(false);
    expect(isSyncTag('netflix-sync:42')).toBe(false);
    expect(isSyncTag(ID)).toBe(false);
  });
});

describe('UnresolvedKeySchema', () => {
  it('takes a service’s own ids, numeric or not', () => {
    for (const key of ['81234567', 'p0abc12x', 'b00-x_1']) {
      expect(v.is(UnresolvedKeySchema, key)).toBe(true);
    }
  });

  it('refuses what would break the stored key or the cursor', () => {
    for (const key of ['', 'a#b', 'a/b', 'a b', 'x'.repeat(65)]) {
      expect(v.is(UnresolvedKeySchema, key)).toBe(false);
    }
  });
});

describe('ConnectionLinkRequestSchema', () => {
  const cookie = (name: string, value: string) => ({
    domain: '.netflix.com',
    expiresDate: null,
    httpOnly: true,
    name,
    path: '/',
    sameSite: 'lax',
    secure: true,
    value,
  });
  const link = (...cookies: ReturnType<typeof cookie>[]) => ({
    code: '4829',
    cookies,
  });

  it('takes cookies as RFC 6265 writes them, quoted values too', () => {
    expect(
      v.is(
        ConnectionLinkRequestSchema,
        link(
          cookie('NetflixId', 'v%3D3%26ct%3DBgjHlOvcAx'),
          cookie('session-token', 'a+b/c=='),
          cookie('quoted', '"abc"'),
          cookie('empty', ''),
        ),
      ),
    ).toBe(true);
  });

  it('drops a cookie a header could not carry, and keeps the rest of the link', () => {
    for (const bad of [
      cookie('a b', 'x'),
      cookie('a;b', 'x'),
      cookie('', 'x'),
      cookie('ok', 'line\r\nx-injected: 1'),
      cookie('ok', 'semi;colon'),
      cookie('ok', 'café'),
      cookie('ok', 'back\\slash'),
    ]) {
      const parsed = v.parse(
        ConnectionLinkRequestSchema,
        link(cookie('NetflixId', 'v%3D1'), bad),
      );
      expect(
        parsed.cookies.map(({ name }) => name),
        `${bad.name}=${bad.value}`,
      ).toEqual(['NetflixId']);
    }
  });

  it('takes a user agent in printable ASCII only', () => {
    expect(
      v.is(ConnectionLinkRequestSchema, {
        ...link(),
        userAgent: 'Mozilla/5.0 (Macintosh) Chrome/142.0.0.0 Safari/537.36',
      }),
    ).toBe(true);
    for (const userAgent of ['Mozilla\r\nx: 1', 'Navigateur é', '']) {
      expect(v.is(ConnectionLinkRequestSchema, { ...link(), userAgent })).toBe(
        false,
      );
    }
  });

  it('leaves a stored jar’s cookies as they are (a service may renew one oddly)', () => {
    expect(v.is(ConnectionCookieSchema, cookie('odd', 'a b,c'))).toBe(true);
  });
});
