import 'server-only';

import type { Client } from '@openauthjs/openauth/client';
import { InvalidRefreshTokenError } from '@openauthjs/openauth/error';

import type { TokenPayload } from './crypto';

/**
 * - `refreshed`: new tokens; the caller MUST persist them (OpenAuth rotates
 *   refresh tokens, so the old one is spent).
 * - `rejected`: the auth server refused the refresh token (`invalid_grant`:
 *   revoked, expired, or spent longer ago than its reuse window). The only
 *   outcome that ends a session.
 * - `unavailable`: no verdict (network error, timeout, 5xx, 429, a malformed
 *   answer). Keep the session; the next request tries again.
 */
export type RefreshResult = Readonly<
  | { kind: 'refreshed'; tokens: TokenPayload }
  | { kind: 'rejected' }
  | { kind: 'unavailable'; error: unknown }
>;

export type RefresherDeps = Readonly<{
  refresh: Client['refresh'];
  /** Milliseconds since the epoch, like `Date.now()`. */
  now: () => number;
}>;

/**
 * How long a result is reused for the same refresh token. A burst of requests
 * (a page load, parallel tabs, prefetch-driven navigations) carries the same
 * expired cookie; they all get the first answer. It must stay well inside the
 * auth server's reuse window (`ttl.reuse`, 300 s in `apps/auth`), so this
 * never hands out anything the auth server itself would not.
 */
const REMEMBER_MS = 30_000;
const MAX_ENTRIES = 1000;

type Entry = { result: Promise<RefreshResult>; settledAt?: number };

async function keyOf(refreshToken: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(refreshToken),
  );
  return Buffer.from(digest).toString('base64url');
}

async function callAuthServer(
  refreshToken: string,
  { now, refresh }: RefresherDeps,
): Promise<RefreshResult> {
  let answer: Awaited<ReturnType<Client['refresh']>>;
  try {
    answer = await refresh(refreshToken);
  } catch (error) {
    return { error, kind: 'unavailable' };
  }
  if (answer.err) {
    // `authServerFetch` turns every answer but a JSON `invalid_grant` into an
    // exception, so a refused token is the only error that reaches here as
    // `InvalidRefreshTokenError`. Anything else is no verdict.
    return answer.err instanceof InvalidRefreshTokenError
      ? { kind: 'rejected' }
      : { error: answer.err, kind: 'unavailable' };
  }
  const tokens = answer.tokens;
  if (
    typeof tokens?.access !== 'string' ||
    typeof tokens.refresh !== 'string' ||
    typeof tokens.expiresIn !== 'number'
  ) {
    return { error: new Error('incomplete token answer'), kind: 'unavailable' };
  }
  return {
    kind: 'refreshed',
    tokens: {
      accessToken: tokens.access,
      expiresAt: Math.floor(now() / 1000) + tokens.expiresIn,
      refreshToken: tokens.refresh,
    },
  };
}

/**
 * Refreshes a session's tokens, at most once per refresh token at a time in
 * this server instance: concurrent and closely following requests with the
 * same token share one auth server call and its result (single flight, keyed
 * by a hash of the token). Serverless instances don't share memory, so other
 * instances may still call; the auth server's reuse window makes those
 * answers the same tokens.
 */
export function createRefresher(
  deps: RefresherDeps,
  { maxEntries = MAX_ENTRIES }: Readonly<{ maxEntries?: number }> = {},
) {
  const entries = new Map<string, Entry>();

  const isFresh = (entry: Entry) =>
    entry.settledAt === undefined ||
    deps.now() - entry.settledAt <= REMEMBER_MS;

  function prune() {
    for (const [key, entry] of entries) {
      if (!isFresh(entry)) {
        entries.delete(key);
      }
    }
    // Still too many (a flood of distinct tokens): drop the oldest.
    for (const key of entries.keys()) {
      if (entries.size < maxEntries) {
        break;
      }
      entries.delete(key);
    }
  }

  return async function refresh(refreshToken: string): Promise<RefreshResult> {
    const key = await keyOf(refreshToken);
    const current = entries.get(key);
    if (current && isFresh(current)) {
      return current.result;
    }
    if (entries.size >= maxEntries) {
      prune();
    }
    const entry: Entry = {
      result: callAuthServer(refreshToken, deps).then((result) => {
        if (result.kind === 'unavailable') {
          // No verdict to share: the next request asks again.
          if (entries.get(key) === entry) {
            entries.delete(key);
          }
        } else {
          entry.settledAt = deps.now();
        }
        return result;
      }),
    };
    entries.set(key, entry);
    return entry.result;
  };
}
