import { accessTokenOf, type Session } from '@/lib/auth-session';

type AuthorizedFetchDeps = Readonly<{
  fetch: (input: string, init: RequestInit) => Promise<Response>;
  session: Pick<Session, 'getAccessToken' | 'renew'>;
}>;

function withBearer(token: string): RequestInit {
  return { headers: { Authorization: `Bearer ${token}` } };
}

/**
 * GETs an API URL with the admin's access token. When the API answers 401,
 * it renews the token once (shared with every other request refused with the
 * same token) and retries once. Throws `AuthUnavailableError` when the auth
 * server gives no verdict (the admin stays signed in) and `SessionEndedError`
 * when the session is over.
 */
export function createAuthorizedFetch({
  fetch: send,
  session,
}: AuthorizedFetchDeps) {
  return async function authorizedFetch(url: string): Promise<Response> {
    const token = accessTokenOf(await session.getAccessToken());
    const response = await send(url, withBearer(token));
    if (response.status !== 401) {
      return response;
    }
    const renewed = accessTokenOf(await session.renew(token));
    return send(url, withBearer(renewed));
  };
}
