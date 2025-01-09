import { cookies } from 'next/headers';

import { type Session } from '@/types/session';

import { findSession } from './db/session';
import { findUser } from './db/user';
import { decryptToken } from './token';

async function session() {
  const encryptedSessionId = (await cookies()).get('sessionId')?.value;

  if (!encryptedSessionId) {
    return null;
  }

  const decryptedSessionId = decryptToken(encryptedSessionId);
  return findSession(decryptedSessionId);
}

async function user(_session: Session) {
  if (!_session) {
    return null;
  }

  return findUser({ userId: _session.userId });
}

export default async function auth() {
  const _session = await session();

  return {
    session: _session,
    user: _session ? await user(_session) : null,
  };
}
