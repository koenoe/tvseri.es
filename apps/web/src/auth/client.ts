import { createClient } from '@openauthjs/openauth/client';
import { FETCH_TIMEOUT } from '@/constants';

/**
 * The OpenAuth client turns every non-2xx token response into an "invalid
 * token" error, so a 5xx from the auth server would look like a rejected
 * refresh token and log the user out. Throwing instead makes server errors,
 * rate limiting and timeouts surface as exceptions, which callers treat as
 * transient (see `resolveSession`). A 4xx still comes back as a definitive
 * `err` result.
 */
async function authServerFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(input, {
    ...init,
    signal: AbortSignal.timeout(FETCH_TIMEOUT),
  });

  if (response.status >= 500 || response.status === 429) {
    throw new Error(`Auth server responded with ${response.status}`);
  }

  return response;
}

export const client = createClient({
  clientID: 'website',
  fetch: authServerFetch,
  issuer: process.env.AUTH_URL!,
});
