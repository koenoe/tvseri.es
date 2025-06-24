import crypto from 'crypto';

export function encryptToken(plaintext: string, secretKey: string) {
  const key = Buffer.from(secretKey, 'base64');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([
    iv,
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  return encrypted.toString('base64url');
}

export function decryptToken(ivCiphertextB64: string, secretKey: string) {
  const key = Buffer.from(secretKey, 'base64');
  const ivCiphertext = Buffer.from(ivCiphertextB64, 'base64url');
  const iv = ivCiphertext.subarray(0, 16);
  const ciphertext = ivCiphertext.subarray(16);
  const cipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  const decrypted = Buffer.concat([cipher.update(ciphertext), cipher.final()]);
  return decrypted.toString('utf-8');
}
