import type { Tokens } from '@openauthjs/openauth/client';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from '@/constants';
import { encryptToken } from './crypto';

// Create a new session (for callback route)
export async function createSession(tokens: Tokens): Promise<void> {
  const { access, refresh, expiresIn } = tokens;
  const cookieStore = await cookies();
  const encrypted = await encryptToken({
    accessToken: access,
    expiresAt: Math.floor(Date.now() / 1000) + expiresIn,
    refreshToken: refresh,
  });
  cookieStore.set(SESSION_COOKIE_NAME, encrypted, SESSION_COOKIE_OPTIONS);
}

// Delete session (for logout)
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
