import type { Client } from '@openauthjs/openauth/client';
import { InvalidRefreshTokenError } from '@openauthjs/openauth/error';

// Key and shape are what signed-in admins already have in localStorage:
// changing either would sign them out on deploy.
const STORAGE_KEY = 'auth';

type StoredTokens = Readonly<{
  accessToken: string;
  refreshToken: string;
}>;

/**
 * - `ok`: a usable access token.
 * - `signed-out`: no tokens, or the auth server refused the refresh token
 *   (`invalid_grant`). The only outcome that ends a session.
 * - `unavailable`: no verdict (network error, timeout, 5xx, 429, a malformed
 *   answer). The tokens stay; the next attempt asks again.
 */
export type AccessResult = Readonly<
  | { kind: 'ok'; accessToken: string }
  | { kind: 'signed-out' }
  | { kind: 'unavailable'; error: unknown }
>;

/** The auth server gave no verdict; the admin is still signed in. */
export class AuthUnavailableError extends Error {
  constructor(cause: unknown) {
    super('The sign-in service is unavailable', { cause });
    this.name = 'AuthUnavailableError';
  }
}

/** The session ended (refresh token refused, or signed out elsewhere). */
export class SessionEndedError extends Error {
  constructor() {
    super('The session has ended');
    this.name = 'SessionEndedError';
  }
}

export function accessTokenOf(result: AccessResult): string {
  if (result.kind === 'ok') {
    return result.accessToken;
  }
  if (result.kind === 'unavailable') {
    throw new AuthUnavailableError(result.error);
  }
  throw new SessionEndedError();
}

export type SessionDeps = Readonly<{
  refresh: Client['refresh'];
  storage: Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>;
}>;

const signedOut: AccessResult = { kind: 'signed-out' };

/**
 * The dashboard's OpenAuth session. Tokens are read from storage on every
 * call, not kept in memory: localStorage is shared by every tab, so a tab
 * always refreshes with the latest refresh token another tab saved. Within a
 * tab, one refresh is in flight at a time and every caller shares it. Tabs
 * that refresh at the same moment with the same token get the same successor
 * from the auth server (its reuse window), so they never sign each other out.
 */
export function createSession({ refresh, storage }: SessionDeps) {
  let inflight: Promise<AccessResult> | undefined;

  function read(): StoredTokens | undefined {
    try {
      const value: unknown = JSON.parse(storage.getItem(STORAGE_KEY) ?? '');
      if (
        typeof value === 'object' &&
        value !== null &&
        'accessToken' in value &&
        'refreshToken' in value &&
        typeof value.accessToken === 'string' &&
        typeof value.refreshToken === 'string'
      ) {
        return {
          accessToken: value.accessToken,
          refreshToken: value.refreshToken,
        };
      }
    } catch {
      // Nothing stored, or not JSON: signed out.
    }
    return undefined;
  }

  function save(tokens: StoredTokens): void {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      }),
    );
  }

  function clear(): void {
    storage.removeItem(STORAGE_KEY);
  }

  async function ask(
    stored: StoredTokens,
    force: boolean,
  ): Promise<AccessResult> {
    let answer: Awaited<ReturnType<Client['refresh']>>;
    try {
      // With `access`, OpenAuth skips the call while it is valid for 30 s more.
      answer = await refresh(
        stored.refreshToken,
        force ? undefined : { access: stored.accessToken },
      );
    } catch (error) {
      return { error, kind: 'unavailable' };
    }

    if (answer.err) {
      // `authServerFetch` throws for every answer but a JSON `invalid_grant`,
      // so a refused token is the only error that arrives as this class.
      if (!(answer.err instanceof InvalidRefreshTokenError)) {
        return { error: answer.err, kind: 'unavailable' };
      }
      const current = read();
      if (current && current.refreshToken !== stored.refreshToken) {
        // Another tab rotated the token while this one asked: use its tokens.
        return { accessToken: current.accessToken, kind: 'ok' };
      }
      clear();
      return signedOut;
    }

    if (!answer.tokens) {
      return { accessToken: stored.accessToken, kind: 'ok' };
    }

    const { access, refresh: next } = answer.tokens;
    if (typeof access !== 'string' || typeof next !== 'string') {
      return {
        error: new Error('Incomplete token answer'),
        kind: 'unavailable',
      };
    }
    save({ accessToken: access, refreshToken: next });
    return { accessToken: access, kind: 'ok' };
  }

  function shared(force: boolean): Promise<AccessResult> {
    if (!inflight) {
      const stored = read();
      if (!stored) {
        return Promise.resolve(signedOut);
      }
      inflight = ask(stored, force).finally(() => {
        inflight = undefined;
      });
    }
    return inflight;
  }

  return {
    clear,
    /** A usable access token, refreshed first when it expires within 30 s. */
    getAccessToken: (): Promise<AccessResult> => shared(false),
    read,
    /**
     * A new access token after the API refused `rejected`. Every request
     * refused with the same token shares one refresh.
     */
    async renew(rejected: string): Promise<AccessResult> {
      if (inflight) {
        const result = await inflight;
        if (result.kind !== 'ok' || result.accessToken !== rejected) {
          return result;
        }
      }
      const stored = read();
      if (stored && stored.accessToken !== rejected) {
        return { accessToken: stored.accessToken, kind: 'ok' };
      }
      return shared(true);
    },
    save,
  };
}

export type Session = ReturnType<typeof createSession>;
