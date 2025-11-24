import { createClient } from '@openauthjs/openauth/client';
import { createSubjects } from '@openauthjs/openauth/subject';
import { UserSchema } from '@tvseri.es/schemas/src/user';
import { cookies } from 'next/headers';

import { Resource } from 'sst';

export const subjects = createSubjects({
  user: UserSchema,
});

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
  const accessToken = cookiesStore.get('access_token');
  const refreshToken = cookiesStore.get('refresh_token');

  if (!accessToken) {
    return {
      encryptedSessionId: null,
      session: null,
      user: null,
    };
  }

  const verified = await client.verify(subjects, accessToken.value, {
    refresh: refreshToken?.value,
  });

  if (verified.err) {
    return {
      encryptedSessionId: null,
      session: null,
      user: null,
    };
  }

  if (verified.tokens) {
    await setTokens(verified.tokens.access, verified.tokens.refresh);
  }

  return {
    encryptedSessionId: null,
    session: null,
    user: verified.subject.properties,
  };
}

export default auth;
