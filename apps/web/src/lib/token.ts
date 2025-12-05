import { CompactEncrypt, compactDecrypt } from 'jose';
import { Resource } from 'sst';

export type TokenPayload = {
  accessToken: string;
  expiresAt: number;
  refreshToken: string;
};

// Encryption key derived from secret (cached)
let encryptionKey: Uint8Array | null = null;
async function getEncryptionKey(): Promise<Uint8Array> {
  if (!encryptionKey) {
    const secret = Resource.SessionSecret.value;
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
    encryptionKey = new Uint8Array(bits);
  }
  return encryptionKey;
}

export async function encryptToken(payload: TokenPayload): Promise<string> {
  const key = await getEncryptionKey();
  return new CompactEncrypt(new TextEncoder().encode(JSON.stringify(payload)))
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .encrypt(key);
}

export async function decryptToken(
  token: string,
): Promise<TokenPayload | null> {
  try {
    const key = await getEncryptionKey();
    const { plaintext } = await compactDecrypt(token, key);
    return JSON.parse(new TextDecoder().decode(plaintext)) as TokenPayload;
  } catch {
    return null;
  }
}
