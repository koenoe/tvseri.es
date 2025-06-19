import { createFetch } from '@better-fetch/fetch';
import type { Account, TmdbAccountDetails } from '@tvseri.es/types';
import { Resource } from 'sst';

import { DEFAULT_FETCH_RETRY_OPTIONS } from '@/constants';
import getBaseUrl from '@/utils/getBaseUrl';

import nextPlugin from '../betterFetchNextPlugin';

const tmdbApiKey = Resource.TmdbApiKey.value;
const tmdbApiAccessToken = Resource.TmdbApiAccessToken.value;

if (!tmdbApiKey || !tmdbApiAccessToken) {
  throw new Error('No "API_KEY" found for TMDb');
}

const $fetch = createFetch({
  baseURL: 'https://api.themoviedb.org',
  retry: DEFAULT_FETCH_RETRY_OPTIONS,
  plugins: [nextPlugin],
});

async function tmdbFetch(path: RequestInfo | URL, init?: RequestInit) {
  const pathAsString = path.toString();

  const headers = {
    'content-type': 'application/json',
    ...(pathAsString.startsWith('/4/') && {
      Authorization: `Bearer ${tmdbApiAccessToken}`,
    }),
  };

  const { data, error } = await $fetch(pathAsString, {
    ...init,
    headers: {
      ...headers,
      ...init?.headers,
    },
    query: {
      ...(pathAsString.startsWith('/3/') && {
        api_key: tmdbApiKey,
      }),
    },
  });

  if (error?.status === 404) {
    return undefined;
  }

  if (error) {
    throw new Error(`HTTP error status: ${error.status}`);
  }

  return data;
}

export async function createRequestToken(redirectUri: string = getBaseUrl()) {
  const response = (await tmdbFetch('/4/auth/request_token', {
    cache: 'no-store',
    method: 'POST',
    body: JSON.stringify({
      redirect_to: redirectUri,
    }),
  })) as Readonly<{
    success: boolean;
    status_code: number;
    status_message: string;
    request_token: string;
  }>;

  if (!response.success) {
    console.error('Failed to create request token in TMDb:', response);
  }

  return response.request_token ?? '';
}

export async function createAccessToken(requestToken: string) {
  const response = (await tmdbFetch('/4/auth/access_token', {
    cache: 'no-store',
    method: 'POST',
    body: JSON.stringify({
      request_token: requestToken,
    }),
  })) as Readonly<{
    success: boolean;
    status_code: number;
    status_message: string;
    account_id: string;
    access_token: string;
  }>;

  if (!response.success) {
    console.error('Failed to create access token in TMDb:', response);
    return {
      accountObjectId: null,
      accessToken: null,
    };
  }

  return {
    accountObjectId: response?.account_id,
    accessToken: response?.access_token,
  };
}

export async function createSessionId(accessToken: string) {
  const response = (await tmdbFetch('/3/authentication/session/convert/4', {
    cache: 'no-store',
    method: 'POST',
    body: JSON.stringify({
      access_token: accessToken,
    }),
  })) as Readonly<{
    success: boolean;
    session_id: string;
  }>;

  if (!response.success) {
    console.error('Failed to create session in TMDb:', response);
    return '';
  }

  return response.session_id;
}

export async function deleteSessionId(sessionId: string) {
  await tmdbFetch('/3/authentication/session', {
    cache: 'no-store',
    method: 'DELETE',
    body: JSON.stringify({
      session_id: sessionId,
    }),
  });
}

export async function deleteAccessToken(accessToken: string) {
  await tmdbFetch('/4/auth/access_token', {
    cache: 'no-store',
    method: 'DELETE',
    body: JSON.stringify({
      access_token: accessToken,
    }),
  });
}

export async function fetchAccountDetails(sessionId: string) {
  const response = (await tmdbFetch(
    `/3/account?session_id=${sessionId}`,
  )) as TmdbAccountDetails;

  return {
    id: response?.id,
    name: response?.name,
    username: response?.username,
    avatar: response.avatar?.gravatar
      ? `https://www.gravatar.com/avatar/${response.avatar.gravatar.hash}`
      : undefined,
  } as Account;
}
