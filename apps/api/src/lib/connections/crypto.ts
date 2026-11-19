import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import {
  DecryptCommand,
  GenerateDataKeyCommand,
  KMSClient,
} from '@aws-sdk/client-kms';
import { Resource } from 'sst';

/**
 * A service's stored sign-in, envelope-encrypted: KMS Encrypt caps plaintext
 * at 4 KB and a cookie jar can be larger, so a fresh data key seals it with
 * AES-256-GCM and KMS wraps the key. User and service are the encryption
 * context and GCM additional data, so one user's secret can't open as
 * another's. Only the sync worker may decrypt.
 *
 * Format: `v1.<wrapped key>.<iv>.<tag>.<ciphertext>` (base64url parts).
 */

const VERSION = 'v1';
const IV_BYTES = 12;
const TAG_BYTES = 16;

const kms = new KMSClient({});
const context = (userId: string, service: string) => ({ service, userId });
const additionalData = (userId: string, service: string) =>
  Buffer.from(`${userId}\n${service}`);

const encode = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64url');
const decode = (text: string) => Buffer.from(text, 'base64url');

export const encryptSecret = async (
  userId: string,
  service: string,
  plaintext: string,
): Promise<string> => {
  const { CiphertextBlob, Plaintext } = await kms.send(
    new GenerateDataKeyCommand({
      EncryptionContext: context(userId, service),
      KeyId: Resource.ConnectionsKey.keyId,
      KeySpec: 'AES_256',
    }),
  );
  if (!CiphertextBlob || !Plaintext) {
    throw new Error('encryptSecret: KMS returned no data key');
  }
  const key = Buffer.from(Plaintext);
  try {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv('aes-256-gcm', key, iv, {
      authTagLength: TAG_BYTES,
    });
    cipher.setAAD(additionalData(userId, service));
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    return [
      VERSION,
      encode(CiphertextBlob),
      encode(iv),
      encode(cipher.getAuthTag()),
      encode(ciphertext),
    ].join('.');
  } finally {
    // The plaintext data key lives only as long as this call
    key.fill(0);
    Plaintext.fill(0);
  }
};

/** Needs kms:Decrypt (sync worker only); throws on a malformed, tampered or foreign secret */
export const decryptSecret = async (
  userId: string,
  service: string,
  secret: string,
): Promise<string> => {
  const [version, wrappedKey, iv, tag, ciphertext, ...rest] = secret.split('.');
  if (
    version !== VERSION ||
    !wrappedKey ||
    !iv ||
    !tag ||
    ciphertext === undefined ||
    rest.length > 0
  ) {
    throw new Error('decryptSecret: not a v1 secret');
  }
  const { Plaintext } = await kms.send(
    new DecryptCommand({
      CiphertextBlob: decode(wrappedKey),
      EncryptionContext: context(userId, service),
      KeyId: Resource.ConnectionsKey.keyId,
    }),
  );
  if (!Plaintext) {
    throw new Error('decryptSecret: KMS returned no data key');
  }
  const key = Buffer.from(Plaintext);
  try {
    // A pinned tag length: GCM would otherwise accept a truncated tag
    const decipher = createDecipheriv('aes-256-gcm', key, decode(iv), {
      authTagLength: TAG_BYTES,
    });
    decipher.setAAD(additionalData(userId, service));
    decipher.setAuthTag(decode(tag));
    return Buffer.concat([
      decipher.update(decode(ciphertext)),
      decipher.final(),
    ]).toString('utf8');
  } finally {
    key.fill(0);
    Plaintext.fill(0);
  }
};
