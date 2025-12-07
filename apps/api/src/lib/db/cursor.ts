import { Buffer } from 'node:buffer';

export function decodeCursor(cursor: string | null | undefined) {
  if (!cursor) return undefined;
  return JSON.parse(Buffer.from(cursor, 'base64url').toString());
}

export function encodeCursor(key: unknown) {
  if (!key) return null;
  return Buffer.from(JSON.stringify(key)).toString('base64url');
}
