import 'server-only';

import { type Client, createClient } from '@openauthjs/openauth/client';
import { createAuthServerFetch } from '@tvseri.es/utils';

import { FETCH_TIMEOUT } from '@/lib/constants';

/**
 * Only an OAuth `invalid_grant` from the token endpoint reaches OpenAuth as a
 * refusal; server errors, rate limiting, timeouts and any other 4xx throw, so
 * callers keep the session (`auth/refresh.ts`).
 */
const authServerFetch = createAuthServerFetch(FETCH_TIMEOUT);

let client: Client | null = null;

/**
 * The OpenAuth client for the website. Created on first use, so importing
 * auth modules (and building the app) needs no `AUTH_URL`.
 */
export function getAuthClient(): Client {
  if (!client) {
    const issuer = process.env.AUTH_URL;
    if (!issuer) {
      throw new Error('AUTH_URL is not set');
    }
    client = createClient({
      clientID: 'website',
      fetch: authServerFetch,
      issuer,
    });
  }
  return client;
}
