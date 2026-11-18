import { CompactEncrypt } from 'jose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { decryptToken, encryptToken, type TokenPayload } from './crypto';

/** The cookie key for `secret`, derived the way `crypto.ts` does */
async function keyFor(secret: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const material = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      hash: 'SHA-256',
      iterations: 100000,
      name: 'PBKDF2',
      salt: encoder.encode('tvseries-session'),
    },
    material,
    256,
  );
  return new Uint8Array(bits);
}

const TOKENS: TokenPayload = {
  accessToken: 'access-1',
  expiresAt: 1_800_000_000,
  refreshToken: 'refresh-1',
};

describe('session token crypto', () => {
  beforeEach(() => {
    vi.stubEnv('SECRET_KEY', 'test-secret');
  });

  it('decrypts what it encrypted', async () => {
    const cookie = await encryptToken(TOKENS);

    expect(cookie).not.toContain('access-1');
    expect(await decryptToken(cookie)).toEqual(TOKENS);
  });

  it('rejects a cookie encrypted with another secret', async () => {
    vi.stubEnv('SECRET_KEY', 'other-secret');
    const cookie = await encryptToken(TOKENS);
    vi.stubEnv('SECRET_KEY', 'test-secret');

    expect(await decryptToken(cookie)).toBeNull();
  });

  it.each(['', 'garbage', 'a.b.c.d.e'])(
    'rejects the cookie %j',
    async (cookie) => {
      expect(await decryptToken(cookie)).toBeNull();
    },
  );

  it('rejects a tampered cookie', async () => {
    const cookie = await encryptToken(TOKENS);
    const parts = cookie.split('.');
    // change the first character of the tag: every bit of it counts (the
    // last characters of a base64url tag carry unused bits, and a fixed
    // replacement could leave the tag as it was)
    const tag = parts[3] ?? '';
    parts[3] = `${tag.startsWith('A') ? 'B' : 'A'}${tag.slice(1)}`;

    expect(await decryptToken(parts.join('.'))).toBeNull();
  });

  it('decrypts a cookie made outside it with the same key', async () => {
    const cookie = await new CompactEncrypt(
      new TextEncoder().encode(JSON.stringify(TOKENS)),
    )
      .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
      .encrypt(await keyFor('test-secret'));

    expect(await decryptToken(cookie)).toEqual(TOKENS);
  });

  it('rejects a cookie that names another algorithm for the same key', async () => {
    const cookie = await new CompactEncrypt(
      new TextEncoder().encode(JSON.stringify(TOKENS)),
    )
      .setProtectedHeader({ alg: 'dir', enc: 'A128CBC-HS256' })
      .encrypt(await keyFor('test-secret'));

    expect(await decryptToken(cookie)).toBeNull();
  });

  it.each([
    { accessToken: 'a', expiresAt: '1800000000', refreshToken: 'r' },
    { accessToken: 'a', expiresAt: 1_800_000_000 },
    { accessToken: 1, expiresAt: 1_800_000_000, refreshToken: 'r' },
  ])('rejects a payload of the wrong shape: %j', async (payload) => {
    const cookie = await encryptToken(payload as unknown as TokenPayload);

    expect(await decryptToken(cookie)).toBeNull();
  });

  it('throws instead of using a guessable key when SECRET_KEY is missing', async () => {
    vi.stubEnv('SECRET_KEY', undefined);

    await expect(encryptToken(TOKENS)).rejects.toThrow('SECRET_KEY');
    await expect(decryptToken('x.y.z')).rejects.toThrow('SECRET_KEY');
  });
});
