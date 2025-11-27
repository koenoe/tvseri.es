import { createClient } from '@openauthjs/openauth/client';
import { subjects, type User } from '@tvseri.es/schemas';
import type { NextApiRequest } from 'next';
import { cookies, headers } from 'next/headers';
import type { NextRequest } from 'next/server';
import { cache } from 'react';
import { Resource } from 'sst';
import { me } from './lib/api';
import getBaseUrl from './utils/getBaseUrl';

type AuthArgs = NextApiRequest | Request | NextRequest;

type SessionResult = Readonly<{
  accessToken: string | null;
  user: User | null;
}>;

const EMPTY_SESSION: SessionResult = {
  accessToken: null,
  user: null,
};

const SECURE_COOKIE = process.env.NODE_ENV === 'production';

export const client = createClient({
  clientID: 'website',
  issuer: Resource.Auth.url,
});

export async function setTokens(access: string, refresh: string) {
  const cookiesStore = await cookies();

  cookiesStore.set({
    httpOnly: true,
    maxAge: 34560000,
    name: 'access_token',
    path: '/',
    sameSite: 'lax',
    secure: SECURE_COOKIE,
    value: access,
  });
  cookiesStore.set({
    httpOnly: true,
    maxAge: 34560000,
    name: 'refresh_token',
    path: '/',
    sameSite: 'lax',
    secure: SECURE_COOKIE,
    value: refresh,
  });
}

export async function clearTokens() {
  const cookiesStore = await cookies();

  cookiesStore.delete('access_token');
  cookiesStore.delete('refresh_token');
}

async function getSession(headers: Headers): Promise<SessionResult> {
  try {
    const url = `${getBaseUrl()}/api/auth/session`;
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { cookie: headers.get('cookie') ?? '' },
    });

    if (!res.ok) {
      return EMPTY_SESSION;
    }

    const result = (await res.json()) as SessionResult;
    return result;
  } catch {
    return EMPTY_SESSION;
  }
}

async function handleAuth() {
  const cookieStore = await cookies();
  const accessTokenCookie = cookieStore.get('access_token')?.value;
  const refreshTokenCookie = cookieStore.get('refresh_token')?.value;

  if (!accessTokenCookie) {
    return EMPTY_SESSION;
  }

  const verified = await client.verify(subjects, accessTokenCookie, {
    refresh: refreshTokenCookie,
  });

  if ('err' in verified) {
    await clearTokens();
    return EMPTY_SESSION;
  }

  if (verified.tokens) {
    await setTokens(verified.tokens.access, verified.tokens.refresh);
  }

  const accessToken = verified.tokens?.access ?? accessTokenCookie;
  const user = await me({ accessToken }).catch(() => null);

  if (!user) {
    await clearTokens();
    return EMPTY_SESSION;
  }

  return {
    accessToken,
    user,
  };
}

export const auth = cache(async (args?: AuthArgs) => {
  if (!args) {
    // React Server Components
    const _headers = await headers();
    const session = await getSession(_headers);
    return session;
  }

  // Handle API Routes / Route Handlers
  if (args instanceof Request) {
    return handleAuth();
  }

  return EMPTY_SESSION;
});

export default auth;
