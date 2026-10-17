import { Buffer } from 'node:buffer';
import type { AttributeValue } from '@aws-sdk/client-dynamodb';
import { HTTPException } from 'hono/http-exception';

/**
 * Decodes a client-supplied pagination cursor. A malformed cursor is a 400,
 * not a 500. (A well-formed cursor for another index is rejected by DynamoDB
 * and mapped to 400 in app.onError.)
 */
export function decodeCursor(cursor: string | null | undefined) {
  if (!cursor) return undefined;
  try {
    const key: unknown = JSON.parse(
      Buffer.from(cursor, 'base64url').toString(),
    );
    if (typeof key !== 'object' || key === null || Array.isArray(key)) {
      throw new Error('Cursor is not an object');
    }
    return key as Record<string, AttributeValue>;
  } catch {
    throw new HTTPException(400, { message: 'Invalid cursor' });
  }
}

export function encodeCursor(key: unknown) {
  if (!key) return null;
  return Buffer.from(JSON.stringify(key)).toString('base64url');
}
