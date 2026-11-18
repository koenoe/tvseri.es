import { createClient } from '@openauthjs/openauth/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAuthorizedFetch } from './api/authorized-fetch';
import { authServerFetch } from './auth-server-fetch';
import {
  AuthUnavailableError,
  createSession,
  SessionEndedError,
} from './auth-session';

const AUTH = 'https://auth.test';
const API = 'https://api.test/metrics/api';

let serial = 0;

/** An unsigned JWT-shaped token; OpenAuth's refresh only decodes `exp`. */
function accessToken(validForSeconds: number): string {
  const part = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  serial += 1;
  return `${part({ alg: 'ES256' })}.${part({
    exp: Math.floor(Date.now() / 1000) + validForSeconds,
    n: serial,
  })}.signature`;
}

type TokenAnswer = () => Response | Promise<Response>;

const answers = {
  html502: () => new Response('<html>Bad gateway</html>', { status: 502 }),
  invalidGrant: () =>
    Response.json({ error: 'invalid_grant' }, { status: 400 }),
  json500: () => Response.json({ error: 'server_error' }, { status: 500 }),
  malformed: () => new Response('not json', { status: 200 }),
  network: () => Promise.reject(new TypeError('Failed to fetch')),
  rateLimited: () => new Response(null, { status: 429 }),
  timeout: () =>
    Promise.reject(
      new DOMException('The operation timed out.', 'TimeoutError'),
    ),
} satisfies Record<string, TokenAnswer>;

/** A fake auth server and API behind the global `fetch`. */
function setup() {
  const storage = new Map<string, string>();
  const server = {
    apiCalls: [] as string[],
    tokenCalls: 0,
    /** Access tokens the API accepts. */
    validAccess: new Set<string>(),
  };

  const issueTokens: TokenAnswer = () => {
    const access = accessToken(3600);
    server.validAccess.add(access);
    return Response.json({
      access_token: access,
      expires_in: 3600,
      refresh_token: `refresh-${serial}`,
    });
  };
  let tokenAnswer = issueTokens;

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === `${AUTH}/token`) {
        server.tokenCalls += 1;
        return tokenAnswer();
      }
      const bearer = (
        new Headers(init?.headers).get('Authorization') ?? ''
      ).replace('Bearer ', '');
      server.apiCalls.push(bearer);
      return server.validAccess.has(bearer)
        ? Response.json({ ok: true })
        : new Response(null, { status: 401 });
    }),
  );

  const client = createClient({
    clientID: 'dashboard',
    fetch: authServerFetch,
    issuer: AUTH,
  });
  const session = createSession({
    refresh: (token, options) => client.refresh(token, options),
    storage: {
      getItem: (key) => storage.get(key) ?? null,
      removeItem: (key) => void storage.delete(key),
      setItem: (key, value) => void storage.set(key, value),
    },
  });
  const authorizedFetch = createAuthorizedFetch({
    fetch: (input, init) => fetch(input, init),
    session,
  });

  return {
    answerTokenWith: (answer: TokenAnswer) => {
      tokenAnswer = answer;
    },
    authorizedFetch,
    issueTokens,
    server,
    session,
    signIn: (access: string, refresh = 'refresh-0') =>
      storage.set(
        'auth',
        JSON.stringify({ accessToken: access, refreshToken: refresh }),
      ),
    stored: () => storage.get('auth'),
  };
}

let t: ReturnType<typeof setup>;

beforeEach(() => {
  t = setup();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('session', () => {
  it('does not call the auth server while the access token is valid', async () => {
    const access = accessToken(3600);
    t.signIn(access);

    await expect(t.session.getAccessToken()).resolves.toEqual({
      accessToken: access,
      kind: 'ok',
    });
    expect(t.server.tokenCalls).toBe(0);
  });

  it('ends the session when the auth server refuses the refresh token (invalid_grant)', async () => {
    t.signIn(accessToken(-60));
    t.answerTokenWith(answers.invalidGrant);

    await expect(t.session.getAccessToken()).resolves.toEqual({
      kind: 'signed-out',
    });
    expect(t.stored()).toBeUndefined();
  });

  it.each(Object.entries(answers).filter(([name]) => name !== 'invalidGrant'))(
    'keeps the session when the auth server gives no verdict (%s)',
    async (_, answer) => {
      t.signIn(accessToken(-60));
      const before = t.stored();
      t.answerTokenWith(answer);

      const result = await t.session.getAccessToken();

      expect(result.kind).toBe('unavailable');
      expect(t.stored()).toBe(before);
    },
  );

  it('shares one refresh among parallel callers and saves the new tokens', async () => {
    t.signIn(accessToken(-60));

    const results = await Promise.all([
      t.session.getAccessToken(),
      t.session.getAccessToken(),
      t.session.getAccessToken(),
    ]);

    expect(t.server.tokenCalls).toBe(1);
    expect(results[0]?.kind).toBe('ok');
    expect(results[1]).toEqual(results[0]);
    expect(results[2]).toEqual(results[0]);
    expect(t.stored()).toContain(`refresh-${serial}`);
  });

  it('keeps the session when another tab rotated the refresh token meanwhile', async () => {
    t.signIn(accessToken(-60), 'refresh-old');
    const otherTabAccess = accessToken(3600);
    t.answerTokenWith(() => {
      // The other tab saved its rotated tokens before this answer arrived.
      t.signIn(otherTabAccess, 'refresh-new');
      return answers.invalidGrant();
    });

    await expect(t.session.getAccessToken()).resolves.toEqual({
      accessToken: otherTabAccess,
      kind: 'ok',
    });
    expect(t.stored()).toContain('refresh-new');
  });
});

describe('authorizedFetch', () => {
  it('shares one refresh between two parallel 401s and retries both with the new token', async () => {
    const stale = accessToken(3600); // not expired, but the API refuses it
    t.signIn(stale);

    const responses = await Promise.all([
      t.authorizedFetch(API),
      t.authorizedFetch(API),
    ]);

    expect(responses.map((r) => r.status)).toEqual([200, 200]);
    expect(t.server.tokenCalls).toBe(1);
    expect(t.server.apiCalls).toHaveLength(4);
    expect(t.server.apiCalls.slice(2)).not.toContain(stale);
  });

  it('does not refresh again for a 401 on a token that was already replaced', async () => {
    const stale = accessToken(3600);
    t.signIn(stale);
    await t.authorizedFetch(API);
    expect(t.server.tokenCalls).toBe(1);

    await expect(t.session.renew(stale)).resolves.toMatchObject({
      kind: 'ok',
    });
    expect(t.server.tokenCalls).toBe(1);
  });

  it.each([
    ['500', answers.json500],
    ['timeout', answers.timeout],
    ['network error', answers.network],
  ])(
    'auth server %s on a 401: fails visibly, stays signed in, and the next attempt retries once with the new token',
    async (_, outage) => {
      const stale = accessToken(3600);
      t.signIn(stale);
      t.answerTokenWith(outage);

      await expect(t.authorizedFetch(API)).rejects.toBeInstanceOf(
        AuthUnavailableError,
      );
      expect(t.stored()).toContain(stale);

      t.answerTokenWith(t.issueTokens);
      t.server.apiCalls.length = 0;
      const response = await t.authorizedFetch(API);

      expect(response.status).toBe(200);
      expect(t.server.apiCalls).toHaveLength(2);
      expect(t.server.apiCalls[0]).toBe(stale);
      expect(t.server.apiCalls[1]).not.toBe(stale);
    },
  );

  it('expired token and auth server down: fails visibly without calling the API', async () => {
    t.signIn(accessToken(-60));
    t.answerTokenWith(answers.timeout);

    await expect(t.authorizedFetch(API)).rejects.toBeInstanceOf(
      AuthUnavailableError,
    );
    expect(t.server.apiCalls).toHaveLength(0);
    expect(t.stored()).toBeDefined();
  });

  it('invalid_grant on a 401: ends the session', async () => {
    t.signIn(accessToken(3600));
    t.answerTokenWith(answers.invalidGrant);

    await expect(t.authorizedFetch(API)).rejects.toBeInstanceOf(
      SessionEndedError,
    );
    expect(t.stored()).toBeUndefined();
  });

  it('retries only once: a second 401 goes back to the caller', async () => {
    t.signIn(accessToken(3600));
    t.answerTokenWith(() =>
      Response.json({
        access_token: accessToken(3600), // the API refuses this one too
        expires_in: 3600,
        refresh_token: 'refresh-1',
      }),
    );

    const response = await t.authorizedFetch(API);

    expect(response.status).toBe(401);
    expect(t.server.apiCalls).toHaveLength(2);
    expect(t.server.tokenCalls).toBe(1);
  });
});
