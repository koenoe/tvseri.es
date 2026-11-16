import 'server-only';

import { CompactEncrypt, compactDecrypt } from 'jose';
import * as v from 'valibot';

const TokenPayloadSchema = v.object({
  accessToken: v.string(),
  /** Unix time in seconds */
  expiresAt: v.number(),
  refreshToken: v.string(),
});

export type TokenPayload = Readonly<v.InferOutput<typeof TokenPayloadSchema>>;

/**
 * The one algorithm pair session cookies are written with. Decrypting accepts
 * only it, so a cookie can't pick another algorithm for the same key.
 */
const PROTECTED_HEADER = { alg: 'dir', enc: 'A256GCM' } as const;
const DECRYPT_OPTIONS = {
  contentEncryptionAlgorithms: [PROTECTED_HEADER.enc],
  keyManagementAlgorithms: [PROTECTED_HEADER.alg],
};

let cachedKey: Readonly<{ key: Uint8Array; secret: string }> | null = null;

/**
 * The session cookie key, derived from `SECRET_KEY` (read at call time, so a
 * build needs no secret). A missing secret throws: it must never silently
 * become a guessable key, and a misconfiguration must not look like an
 * invalid cookie (that would log everybody out).
 */
async function getEncryptionKey(): Promise<Uint8Array> {
  const secret = process.env.SECRET_KEY;
  if (!secret) {
    throw new Error('SECRET_KEY is not set');
  }
  if (cachedKey?.secret === secret) {
    return cachedKey.key;
  }

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
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
    keyMaterial,
    256,
  );
  const key = new Uint8Array(bits);
  cachedKey = { key, secret };
  return key;
}

export async function encryptToken(payload: TokenPayload): Promise<string> {
  const key = await getEncryptionKey();
  return new CompactEncrypt(new TextEncoder().encode(JSON.stringify(payload)))
    .setProtectedHeader(PROTECTED_HEADER)
    .encrypt(key);
}

/**
 * The tokens in a session cookie, or null when the cookie can't be decrypted
 * or doesn't hold a token payload.
 */
export async function decryptToken(
  token: string,
): Promise<TokenPayload | null> {
  const key = await getEncryptionKey();
  try {
    const { plaintext } = await compactDecrypt(token, key, DECRYPT_OPTIONS);
    const parsed = v.safeParse(
      TokenPayloadSchema,
      JSON.parse(new TextDecoder().decode(plaintext)),
    );
    return parsed.success ? parsed.output : null;
  } catch {
    return null;
  }
}
