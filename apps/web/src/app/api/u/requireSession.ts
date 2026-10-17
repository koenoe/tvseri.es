import auth, { type Session } from '@/auth';

/**
 * Verifies the session in the handler itself (defence in depth: the proxy only checks that the
 * cookie decrypts). Uses the read-only `auth()`: the proxy always runs on /api/u/* and owns
 * refreshing, so refreshing here again could reuse an already-rotated refresh token.
 * Returns the session, or a 401 response to return as-is.
 */
export default async function requireSession(): Promise<Session | Response> {
  const session = await auth();
  if (!session.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return session;
}
