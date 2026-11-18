import 'server-only';

import type { Tokens } from '@openauthjs/openauth/client';

import { getAuthClient } from './client';
import { decryptToken, encryptToken, type TokenPayload } from './crypto';
import { createRefresher, type RefreshResult } from './refresh';

/** Refresh when less than this many seconds of the access token are left. */
const SESSION_REFRESH_THRESHOLD = 60;

/**
 * - `none`: no session cookie.
 * - `invalid`: the cookie can't be decrypted or the auth server refused the
 *   refresh token (`invalid_grant`). The cookie must be deleted.
 * - `stale`: there is a session, but no usable access token right now (it
 *   expired and we may not or could not refresh). Keep the cookie.
 * - `valid`: the access token in the cookie can be used as is.
 * - `refreshed`: new tokens were issued. `cookie` MUST be persisted, because
 *   OpenAuth rotates refresh tokens and the old one is now spent.
 */
export type SessionState = Readonly<
  | { status: 'none' }
  | { status: 'invalid' }
  | { status: 'stale' }
  | { status: 'valid'; tokens: TokenPayload }
  | { status: 'refreshed'; tokens: TokenPayload; cookie: string }
>;

/**
 * - `read-only`: never refresh. Use it where the new cookie can't be written
 *   (RSC); refreshing there would spend the refresh token and lose its
 *   successor.
 * - `refresh`: refresh when the access token is (almost) expired. The caller
 *   must persist the cookie of a `refreshed` result.
 */
type ResolveMode = 'read-only' | 'refresh';

export type SessionContext = 'Proxy' | 'RouteHandler' | 'RSC';

/** The boundaries `resolveSession` talks to; tests pass fakes. */
export type SessionDeps = Readonly<{
  /** One refresh per refresh token at a time (`createRefresher`). */
  refresh: (refreshToken: string) => Promise<RefreshResult>;
  /** Milliseconds since the epoch, like `Date.now()`. */
  now: () => number;
}>;

const now = () => Date.now();

const DEFAULT_DEPS: SessionDeps = {
  now,
  // One per server instance, shared by every request it serves. The auth
  // client is created on first refresh, so importing needs no AUTH_URL.
  refresh: createRefresher({
    now,
    refresh: (token) => getAuthClient().refresh(token),
  }),
};

const NONE: SessionState = { status: 'none' };
const INVALID: SessionState = { status: 'invalid' };
const STALE: SessionState = { status: 'stale' };

const toSeconds = (ms: number) => Math.floor(ms / 1000);

/** Tokens from the auth server as stored in the session cookie. */
export function toTokenPayload(
  { access, expiresIn, refresh }: Tokens,
  nowMs: number = Date.now(),
): TokenPayload {
  return {
    accessToken: access,
    expiresAt: toSeconds(nowMs) + expiresIn,
    refreshToken: refresh,
  };
}

async function refreshSession(
  tokens: TokenPayload,
  context: SessionContext,
  deps: SessionDeps,
): Promise<SessionState> {
  const result = await deps.refresh(tokens.refreshToken);

  switch (result.kind) {
    case 'refreshed':
      return {
        cookie: await encryptToken(result.tokens),
        status: 'refreshed',
        tokens: result.tokens,
      };
    case 'rejected':
      console.log(`[auth] [${context}] refresh rejected: invalid_grant`);
      return INVALID;
    case 'unavailable': {
      // Network error, timeout, 5xx or an answer that isn't a verdict: keep
      // the cookie and try again on the next request.
      console.log(
        `[auth] [${context}] refresh unavailable, keeping session:`,
        result.error instanceof Error ? result.error.message : result.error,
      );
      const isExpired = tokens.expiresAt <= toSeconds(deps.now());
      return isExpired ? STALE : { status: 'valid', tokens };
    }
  }
}

/**
 * Single source of truth for reading (and, if allowed, refreshing) the
 * session cookie. Callers only map the result onto their cookie store.
 */
export async function resolveSession(
  cookie: string | undefined,
  options: Readonly<{ context: SessionContext; mode: ResolveMode }>,
  deps: SessionDeps = DEFAULT_DEPS,
): Promise<SessionState> {
  if (!cookie) {
    return NONE;
  }

  const tokens = await decryptToken(cookie);
  if (!tokens) {
    console.log(`[auth] [${options.context}] invalid session cookie`);
    return INVALID;
  }

  const expiresIn = tokens.expiresAt - toSeconds(deps.now());

  if (expiresIn > SESSION_REFRESH_THRESHOLD) {
    return { status: 'valid', tokens };
  }

  if (options.mode === 'read-only') {
    return expiresIn > 0 ? { status: 'valid', tokens } : STALE;
  }

  return refreshSession(tokens, options.context, deps);
}
