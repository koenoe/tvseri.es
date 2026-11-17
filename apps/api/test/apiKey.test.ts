import { WEBHOOK_TOKEN_KV_PREFIX } from '@tvseri.es/constants';
import { describe, expect, it } from 'vitest';

import { runEdge } from './edge';
import { API_KEY, request } from './request';

const TOKEN = 'a'.repeat(24);

type Case = Readonly<{
  name: string;
  method: string;
  path: string;
  query?: Record<string, string>;
  headers?: Record<string, string>;
  allowed: boolean;
}>;

// One table for both gates: the CloudFront viewer-request function
// (infra/apiEdgeInjection.ts) and the Lambda's requireApiKey must never drift
const CASES: ReadonlyArray<Case> = [
  { allowed: false, method: 'GET', name: 'no key', path: '/genres' },
  {
    allowed: false,
    headers: { 'x-api-key': 'nope' },
    method: 'GET',
    name: 'wrong key',
    path: '/genres',
  },
  {
    allowed: true,
    headers: { 'x-api-key': API_KEY },
    method: 'GET',
    name: 'valid key',
    path: '/genres',
  },
  {
    allowed: false,
    headers: { 'x-api-key': `${API_KEY}x` },
    method: 'GET',
    name: 'the key with a character added',
    path: '/genres',
  },
  { allowed: true, method: 'OPTIONS', name: 'OPTIONS', path: '/genres' },
  {
    allowed: false,
    headers: { authorization: 'Bearer x' },
    method: 'GET',
    name: 'Bearer outside the dashboard routes',
    path: '/me/library-ids',
  },
  {
    allowed: true,
    headers: { authorization: 'Bearer x' },
    method: 'GET',
    name: 'dashboard read with Bearer',
    path: '/metrics/api',
  },
  {
    allowed: false,
    method: 'GET',
    name: 'dashboard read without Bearer',
    path: '/metrics/api',
  },
  {
    allowed: false,
    headers: { authorization: 'Bearer x' },
    method: 'POST',
    name: 'dashboard write with Bearer',
    path: '/metrics/api',
  },
  {
    allowed: false,
    headers: { authorization: 'Bearer x' },
    method: 'GET',
    name: 'dashboard read with a dot segment',
    path: '/metrics/api/%2e%2e/admin',
  },
  {
    allowed: true,
    method: 'POST',
    name: 'scrobble with a well-formed token',
    path: '/scrobble/provider/plex',
    query: { token: TOKEN },
  },
  {
    allowed: false,
    method: 'POST',
    name: 'scrobble with a malformed token',
    path: '/scrobble/provider/plex',
    query: { token: 'short' },
  },
  {
    allowed: false,
    method: 'GET',
    name: 'scrobble GET',
    path: '/scrobble/provider/plex',
    query: { token: TOKEN },
  },
];

// The gate answers with a plain-text 401; anything else reached a route
const passedGate = (response: Response) =>
  response.status !== 401 ||
  Boolean(response.headers.get('content-type')?.includes('application/json'));

// The edge KeyValueStore knows the test token as a Plex token
const passedEdge = async (testCase: Case) => {
  const { outcome } = await runEdge({
    ...testCase,
    kv: { [`${WEBHOOK_TOKEN_KV_PREFIX}${TOKEN}`]: 'plex' },
  });
  return outcome !== 'unauthorized';
};

describe('API key gate', () => {
  it.each(CASES)('Lambda: $name', async (testCase) => {
    const search = new URLSearchParams(testCase.query).toString();
    const response = await request(
      `${testCase.path}${search ? `?${search}` : ''}`,
      {
        apiKey: null,
        headers: testCase.headers,
        method: testCase.method,
      },
    );
    expect(passedGate(response)).toBe(testCase.allowed);
  });

  it.each(CASES)('CloudFront: $name', async (testCase) => {
    expect(await passedEdge(testCase)).toBe(testCase.allowed);
  });
});
