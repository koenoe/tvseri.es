import { randomBytes } from 'node:crypto';
import { KMSClient } from '@aws-sdk/client-kms';
import { vi } from 'vitest';

/**
 * Unwraps a data key only under the context it was made for, so a stored
 * secret is checkable end to end. Returns the contexts keys were made under,
 * newest last.
 */
export const fakeKms = () => {
  const encrypted: Array<Readonly<{ context?: Record<string, string> }>> = [];
  /** wrapped (hex) → the key and its context */
  const wrapped = new Map<string, Readonly<{ context: string; key: Buffer }>>();
  const fakeSend = (async (command: {
    constructor: { name: string };
    input: {
      CiphertextBlob?: Uint8Array;
      EncryptionContext?: Record<string, string>;
    };
  }) => {
    const context = JSON.stringify(command.input.EncryptionContext ?? {});
    if (command.constructor.name === 'GenerateDataKeyCommand') {
      encrypted.push({ context: command.input.EncryptionContext });
      const key = randomBytes(32);
      const blob = randomBytes(16);
      wrapped.set(blob.toString('hex'), { context, key });
      // Copies: the caller zeroes the plaintext key after use
      return { CiphertextBlob: Buffer.from(blob), Plaintext: Buffer.from(key) };
    }
    if (command.constructor.name === 'DecryptCommand') {
      const found = wrapped.get(
        Buffer.from(command.input.CiphertextBlob ?? []).toString('hex'),
      );
      if (!found || found.context !== context) {
        throw new Error('InvalidCiphertextException');
      }
      return { Plaintext: Buffer.from(found.key) };
    }
    throw new Error(`unexpected KMS call ${command.constructor.name}`);
  }) as never;
  vi.spyOn(KMSClient.prototype, 'send').mockImplementation(fakeSend);
  return encrypted;
};
