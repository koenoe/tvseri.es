import type { Role } from '@tvseri.es/schemas';

/**
 * OpenAuth's subject for a user signed in with `{ id, role }` (its issuer
 * hashes the properties apps/auth passes to `ctx.subject('user', …)`). A
 * role changed later keeps the subject the user signed in with.
 */
export const authSubject = async (id: string, role: Role) => {
  const data = new TextEncoder().encode(JSON.stringify({ id, role }));
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-1', data));
  const hex = Array.from(hash, (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  return `user:${hex.slice(0, 16)}`;
};

/**
 * The partition of a subject's refresh rows (its sign-ins) in OpenAuth's
 * DynamoDB storage, which joins the first two key parts with \x1f.
 */
export const authRefreshPartition = (subject: string) =>
  `oauth:refresh\u001f${subject}`;
