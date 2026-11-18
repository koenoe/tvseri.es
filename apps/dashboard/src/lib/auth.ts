import { createClient } from '@openauthjs/openauth/client';
import type { Subject } from '@tvseri.es/schemas';
import { subjects } from '@tvseri.es/schemas';

import { createAuthorizedFetch } from '@/lib/api/authorized-fetch';
import { authServerFetch } from '@/lib/auth-server-fetch';
import { AuthUnavailableError, createSession } from '@/lib/auth-session';

type User = Extract<Subject, { type: 'user' }>['properties'];

const client = createClient({
  clientID: 'dashboard',
  fetch: authServerFetch,
  issuer: import.meta.env.VITE_AUTH_URL,
});

const session = createSession({
  refresh: (refreshToken, options) => client.refresh(refreshToken, options),
  storage: localStorage,
});

export const authorizedFetch = createAuthorizedFetch({
  fetch: (input, init) => fetch(input, init),
  session,
});

async function handleCallback(): Promise<boolean> {
  const params = new URLSearchParams(location.search.slice(1));
  const code = params.get('code');
  const state = params.get('state');

  if (!code || !state) {
    return false;
  }

  const challengeStr = sessionStorage.getItem('challenge');
  if (!challengeStr) {
    return false;
  }

  const challenge = JSON.parse(challengeStr) as {
    state: string;
    verifier?: string;
  };

  if (state !== challenge.state || !challenge.verifier) {
    return false;
  }

  const exchanged = await client.exchange(
    code,
    location.origin,
    challenge.verifier,
  );

  if (exchanged.err || !exchanged.tokens) {
    return false;
  }

  session.save({
    accessToken: exchanged.tokens.access,
    refreshToken: exchanged.tokens.refresh,
  });

  sessionStorage.removeItem('challenge');
  window.history.replaceState({}, '', '/');

  return true;
}

async function verifyToken(accessToken: string): Promise<User | undefined> {
  const verified = await client.verify(subjects, accessToken);
  if (verified.err) {
    return;
  }

  if (verified.subject.type === 'user') {
    return verified.subject.properties;
  }
}

/**
 * The signed-in admin, or undefined when signed out. Throws
 * `AuthUnavailableError` when the auth server gives no verdict: the tokens
 * stay, and the route's error state offers to try again.
 */
export async function init(): Promise<User | undefined> {
  await handleCallback();
  const access = await session.getAccessToken();
  if (access.kind === 'unavailable') {
    throw new AuthUnavailableError(access.error);
  }
  if (access.kind === 'signed-out') {
    return;
  }
  return verifyToken(access.accessToken);
}

export async function getLoginUrl(): Promise<string> {
  const { challenge, url } = await client.authorize(location.origin, 'code', {
    pkce: true,
  });

  sessionStorage.setItem('challenge', JSON.stringify(challenge));
  return url;
}

export function logout(): void {
  const refreshToken = session.read()?.refreshToken;

  // Best-effort server-side revoke; never block logout on it.
  if (refreshToken) {
    fetch(`${import.meta.env.VITE_AUTH_URL}/revoke`, {
      body: new URLSearchParams({ token: refreshToken }),
      keepalive: true,
      method: 'POST',
      signal: AbortSignal.timeout(3000),
    }).catch(() => undefined);
  }

  session.clear();
  window.location.replace('/');
}
