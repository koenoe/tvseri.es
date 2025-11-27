import { createClient } from '@openauthjs/openauth/client';
import { subjects } from '@tvseri.es/schemas';
import { cookies } from 'next/headers';
import { Resource } from 'sst';
import { me } from './lib/api';

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
    value: access,
  });
  cookiesStore.set({
    httpOnly: true,
    maxAge: 34560000,
    name: 'refresh_token',
    path: '/',
    sameSite: 'lax',
    value: refresh,
  });
}

export async function auth() {
  const cookiesStore = await cookies();
  const accessTokenCookie = cookiesStore.get('access_token');
  const refreshTokenCookie = cookiesStore.get('refresh_token');

  if (!accessTokenCookie) {
    return {
      accessToken: null,
      user: null,
    };
  }

  const verified = await client.verify(subjects, accessTokenCookie.value, {
    refresh: refreshTokenCookie?.value,
  });

  if (verified.err) {
    return {
      accessToken: null,
      user: null,
    };
  }

  if (verified.tokens) {
    await setTokens(verified.tokens.access, verified.tokens.refresh);
  }

  const accessToken = verified.tokens
    ? verified.tokens.access
    : accessTokenCookie.value;

  const user = await me({ accessToken });

  if (!user) {
    return {
      accessToken: null,
      user: null,
    };
  }

  return {
    accessToken,
    user,
  };
}

export default auth;
