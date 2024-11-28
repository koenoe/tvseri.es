import { cookies } from 'next/headers';

import { findSession } from '@/lib/db/session';
import { findUser } from '@/lib/db/user';
import { decryptToken } from '@/lib/token';

export async function GET() {
  const cookieStore = await cookies();
  const encryptedSessionId = cookieStore.get('sessionId')?.value;

  if (!encryptedSessionId) {
    return Response.json(null);
  }

  const decryptedSessionId = decryptToken(encryptedSessionId);
  const session = await findSession(decryptedSessionId);

  if (!session) {
    return Response.json(null);
  }

  const user = await findUser({ userId: session.userId });

  if (!user) {
    return Response.json(null);
  }

  return Response.json(user);
}
