import { createClient } from '@openauthjs/openauth/client';
import type { Subject } from '@tvseri.es/schemas';
import { subjects } from '@tvseri.es/schemas';

type User = Extract<Subject, { type: 'user' }>['properties'];

type StoredTokens = Readonly<{
  accessToken: string;
  refreshToken: string;
}>;

const client = createClient({
  clientID: 'dashboard',
  issuer: import.meta.env.VITE_AUTH_URL,
});

const STORAGE_KEY = 'auth';

let tokens: StoredTokens | undefined;
let currentUser: User | undefined;

function parseTokensFromLocalStorage(): StoredTokens | undefined {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return;
  }

  try {
    return JSON.parse(stored) as StoredTokens;
  } catch {
    return;
  }
}

function saveTokens(accessToken: string, refreshToken: string): void {
  tokens = { accessToken, refreshToken };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

function clearTokens(): void {
  tokens = undefined;
  localStorage.removeItem(STORAGE_KEY);
}

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

  saveTokens(exchanged.tokens.access, exchanged.tokens.refresh);

  sessionStorage.removeItem('challenge');
  window.history.replaceState({}, '', '/');

  return true;
}

async function verifyToken(): Promise<User | undefined> {
  if (!tokens?.accessToken) {
    return;
  }

  const verified = await client.verify(subjects, tokens.accessToken);
  if (verified.err) {
    return;
  }

  if (verified.subject.type === 'user') {
    return verified.subject.properties;
  }
}

export async function getAccessToken(): Promise<string | undefined> {
  if (!tokens) {
    tokens = parseTokensFromLocalStorage();
  }

  if (!tokens?.refreshToken) {
    return;
  }

  const next = await client.refresh(tokens.refreshToken, {
    access: tokens.accessToken,
  });

  if (next.err) {
    clearTokens();
    return;
  }

  // No new tokens means current access token is still valid
  if (!next.tokens) {
    return tokens.accessToken;
  }

  saveTokens(next.tokens.access, next.tokens.refresh);

  return next.tokens.access;
}

export async function init(): Promise<User | undefined> {
  await handleCallback();
  await getAccessToken();
  currentUser = await verifyToken();
  return currentUser;
}

export async function getLoginUrl(): Promise<string> {
  const { challenge, url } = await client.authorize(location.origin, 'code', {
    pkce: true,
  });

  sessionStorage.setItem('challenge', JSON.stringify(challenge));
  return url;
}

export function logout(): void {
  clearTokens();

  currentUser = undefined;
  window.location.replace('/');
}
