import type { StubRequest, StubResponse } from '../../types.ts';

/** The API's error shape */
export const fail = (status: number, message: string): StubResponse => ({
  body: { message, status },
  status,
});

export const ok = (body: unknown): StubResponse => ({ body });

/**
 * The viewer id behind the Bearer token. The auth stub signs the tokens;
 * this only decodes the payload (`properties.id`): a local stand-in for the
 * API's `verify`, never pointed at anything real.
 */
export const viewerIdOf = (headers: StubRequest['headers']): string | null => {
  const token = String(headers.authorization ?? '').split(' ')[1];
  const payload = token?.split('.')[1];
  if (!payload) {
    return null;
  }
  try {
    const decoded: unknown = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    );
    const id =
      typeof decoded === 'object' && decoded !== null && 'properties' in decoded
        ? (decoded.properties as { id?: unknown } | null)?.id
        : undefined;
    return typeof id === 'string' ? id : null;
  } catch {
    return null;
  }
};
