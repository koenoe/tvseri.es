/**
 * The fetch an OpenAuth client (`createClient({ fetch })`) uses. The client
 * turns every non-2xx token answer into "invalid refresh token", so anything
 * but a real verdict would sign the user out. This fetch throws instead
 * (callers treat a throw as "no verdict" and keep the session) for server
 * errors, rate limiting, timeouts, and any 4xx from the token endpoint that
 * is not an OAuth `invalid_grant` (RFC 6749 §5.2: the grant or refresh token
 * is invalid, expired, revoked or already used), e.g. a CDN or firewall page
 * or a misconfigured client. Only `invalid_grant` reaches the client as a
 * refusal. Every call gives up after `timeoutMs`.
 */
export const createAuthServerFetch =
  (timeoutMs: number) =>
  async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const response = await fetch(input, {
      ...init,
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (response.status >= 500 || response.status === 429) {
      throw new Error(`Auth server responded with ${response.status}`);
    }

    if (
      response.status >= 400 &&
      isTokenEndpoint(input) &&
      !(await isInvalidGrant(response))
    ) {
      throw new Error(`Auth server responded with ${response.status}`);
    }

    return response;
  };

const isTokenEndpoint = (input: RequestInfo | URL): boolean => {
  const url =
    typeof input === 'string' || input instanceof URL ? input : input.url;
  return new URL(url).pathname.endsWith('/token');
};

const isInvalidGrant = async (response: Response): Promise<boolean> => {
  try {
    const body: unknown = await response.clone().json();
    return (
      typeof body === 'object' &&
      body !== null &&
      'error' in body &&
      body.error === 'invalid_grant'
    );
  } catch {
    return false;
  }
};
