import 'server-only';

import crypto from 'crypto';

const key = Buffer.from(String(process.env.SECRET_KEY), 'base64');

export function encryptToken(plaintext: string) {
  const iv = crypto.randomBytes(16);
  // @ts-ignore
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  // @ts-ignore
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
  // @ts-ignore
  const cipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  // @ts-ignore
  const decrypted = Buffer.concat([cipher.update(ciphertext), cipher.final()]);
  return decrypted.toString('utf-8');
}
