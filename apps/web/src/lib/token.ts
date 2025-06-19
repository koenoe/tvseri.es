import crypto from 'crypto';

import { Resource } from 'sst';

const secretKey = Resource.SecretKey.value;

if (!secretKey) {
  throw new Error('No "SECRET_KEY" found');
}

const key = Buffer.from(secretKey, 'base64');

export function encryptToken(plaintext: string) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([
    iv,
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  return encrypted.toString('base64url');
}

export function decryptToken(ivCiphertextB64: string) {
  const ivCiphertext = Buffer.from(ivCiphertextB64, 'base64url');
  const iv = ivCiphertext.subarray(0, 16);
  const ciphertext = ivCiphertext.subarray(16);
  const cipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  const decrypted = Buffer.concat([cipher.update(ciphertext), cipher.final()]);
  return decrypted.toString('utf-8');
}
