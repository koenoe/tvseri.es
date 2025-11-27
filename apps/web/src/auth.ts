import { createClient } from '@openauthjs/openauth/client';
import type { User } from '@tvseri.es/schemas';
import { cookies, headers } from 'next/headers';
import { cache } from 'react';
import { Resource } from 'sst';
import getBaseUrl from './utils/getBaseUrl';

export const EMPTY_SESSION = {
  accessToken: null,
  user: null,
};

export const client = createClient({
  clientID: 'website',
  issuer: Resource.Auth.url,
});

export async function getTokens() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token')?.value ?? null;
  const refreshToken = cookieStore.get('refresh_token')?.value ?? null;
  return { accessToken, refreshToken };
}

export async function setTokens(access: string, refresh: string) {
  const cookieStore = await cookies();
  const secure = process.env.NODE_ENV === 'production';
  const sameSite = 'lax';
  const path = '/';
  const httpOnly = true;
  const maxAge = 34560000;

  cookieStore.set({
    httpOnly,
    maxAge,
    name: 'access_token',
    path,
    sameSite,
    secure,
    value: access,
  });
  cookieStore.set({
    httpOnly,
    maxAge,
    name: 'refresh_token',
    path,
    sameSite,
    secure,
    value: refresh,
  });
}

export async function deleteTokens() {
  const cookieStore = await cookies();

  cookieStore.delete('access_token');
  cookieStore.delete('refresh_token');
}

async function getSession(headers: Headers) {
  try {
    const url = `${getBaseUrl()}/api/auth/session`;
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { cookie: headers.get('cookie') ?? '' },
    });

    if (!res.ok) {
      return EMPTY_SESSION;
    }

    const result = (await res.json()) as Readonly<{
      accessToken: string | null;
      user: User | null;
    }>;

    return result;
  } catch {
    return EMPTY_SESSION;
  }
}

export const auth = cache(async () => {
  const { accessToken, refreshToken } = await getTokens();
  if (!accessToken || !refreshToken) {
    return EMPTY_SESSION;
  }

  const _headers = await headers();
  const session = await getSession(_headers);
  return session;
});

export default auth;
