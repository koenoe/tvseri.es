import { createHash, randomBytes } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { DynamoStorage } from '@openauthjs/openauth/storage/dynamo';
import { MemoryStorage } from '@openauthjs/openauth/storage/memory';
import {
  joinKey,
  Storage,
  type StorageAdapter,
} from '@openauthjs/openauth/storage/storage';
import { authRefreshPartition, authSubject } from '@tvseri.es/utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { browser, ORIGIN } from './testing/browser';
import { fakeGoogleKey } from './testing/fakeGoogle';
import { authorizeUrl, createTestApp } from './testing/testApp';

/**
 * The library behaviour our pnpm patch of OpenAuth adds (one block per
 * hunk of the patch). The code provider's own hunks are covered by
 * app.test.ts.
 */

type TestApp = ReturnType<typeof createTestApp>;

const VERIFIER = randomBytes(32).toString('base64url');
const CHALLENGE = createHash('sha256').update(VERIFIER).digest('base64url');
const CALLBACK = `${ORIGIN}/api/auth/callback`;

/** An email sign-in up to the site's callback: its authorization code */
async function signIn(test: TestApp, email = 'ana@example.com') {
  const b = browser(test.app);
  await b.get(authorizeUrl(ORIGIN, { code_challenge: CHALLENGE }));
  await b.post('/code/authorize', {
    action: 'request',
    email,
    verify_email: '',
  });
  const res = await b.post('/code/authorize', {
    action: 'verify',
    code: test.lastCode(email) ?? '',
  });
  return new URL(res.headers.get('location') ?? '').searchParams.get('code');
}

const post = (
  test: TestApp,
  path: string,
  fields: Readonly<Record<string, string>>,
  headers: Readonly<Record<string, string>> = {},
) =>
  test.app.request(`${ORIGIN}${path}`, {
    body: new URLSearchParams(fields),
    headers,
    method: 'POST',
  });

const exchange = (
  test: TestApp,
  code: string,
  headers: Readonly<Record<string, string>> = {},
) =>
  post(
    test,
    '/token',
    {
      client_id: 'website',
      code,
      code_verifier: VERIFIER,
      grant_type: 'authorization_code',
      redirect_uri: CALLBACK,
    },
    headers,
  );

const refresh = (test: TestApp, refreshToken: string) =>
  post(test, '/token', {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

type Tokens = Readonly<{ access_token: string; refresh_token: string }>;

/** A signed-in session's tokens, as the site's callback gets them */
async function session(test: TestApp) {
  const res = await exchange(test, (await signIn(test)) ?? '');
  expect(res.status).toBe(200);
  return (await res.json()) as Tokens;
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('/authorize: provider hunk', () => {
  it('only sends the browser on to a provider the issuer has (no open redirect)', async () => {
    const test = createTestApp();
    for (const provider of ['/evil.example', '\\evil.example', 'nope']) {
      const res = await browser(test.app).get(
        authorizeUrl(ORIGIN, { provider }),
      );
      expect(res.status, provider).toBe(400);
      expect(res.headers.get('location'), provider).toBeNull();
    }

    const known = await browser(test.app).get(
      authorizeUrl(ORIGIN, { provider: 'code' }),
    );
    expect(known.status).toBe(302);
    expect(known.headers.get('location')).toBe('/code/authorize');
  });
});

describe('/token: single-use code hunk', () => {
  it('redeems an authorization code once, also when two exchanges race', async () => {
    const test = createTestApp();
    const code = (await signIn(test)) ?? '';

    const results = await Promise.all([
      exchange(test, code),
      exchange(test, code),
    ]);

    expect(results.map((r) => r.status).sort()).toEqual([200, 400]);
  });
});

describe('/revoke: successor hunk', () => {
  it('also revokes what an already rotated refresh token was rotated into', async () => {
    const test = createTestApp();
    const first = await session(test);
    const rotated = (await (
      await refresh(test, first.refresh_token)
    ).json()) as Tokens;

    // Sign-out with the older token (a cookie that missed the rotation)
    const res = await post(test, '/revoke', { token: first.refresh_token });

    expect(res.status).toBe(200);
    expect((await refresh(test, rotated.refresh_token)).status).toBe(400);
  });

  it('revokes the newest token, and leaves the same user’s other sign-ins alone', async () => {
    const test = createTestApp();
    const laptop = await session(test);
    const phone = await session(test);
    await refresh(test, laptop.refresh_token);

    await post(test, '/revoke', { token: laptop.refresh_token });

    expect((await refresh(test, phone.refresh_token)).status).toBe(200);
    const other = await session(test);
    await post(test, '/revoke', { token: other.refresh_token });
    expect((await refresh(test, other.refresh_token)).status).toBe(400);
  });
});

describe('refresh rows (deleted with the account by the API)', () => {
  it('sit in the partition authRefreshPartition(authSubject(id, role)) names', async () => {
    const memory = MemoryStorage();
    const written: string[][] = [];
    const storage: StorageAdapter = {
      ...memory,
      set: (key, value, expiry) => {
        written.push(key);
        return memory.set(key, value, expiry);
      },
    };
    const test = createTestApp({ storage });
    const tokens = await session(test);

    const subject = await authSubject('user-1', 'user');
    expect(tokens.refresh_token.startsWith(`${subject}:`)).toBe(true);
    const refreshRows = written.filter(
      ([prefix]) => prefix === 'oauth:refresh',
    );
    expect(refreshRows).toHaveLength(1);
    expect(joinKey(refreshRows[0]!.slice(0, 2))).toBe(
      authRefreshPartition(subject),
    );
  });
});

describe('issuer origin (apps/auth/src/app.ts)', () => {
  const forged = {
    'x-forwarded-host': 'evil.example',
    'x-forwarded-port': '8443',
    'x-forwarded-proto': 'https',
  };

  it('names itself from its configured origin, whatever forwarded headers say', async () => {
    const test = createTestApp();
    const res = await test.app.request(
      `${ORIGIN}/.well-known/oauth-authorization-server`,
      { headers: forged },
    );
    const body = (await res.json()) as { issuer: string; jwks_uri: string };

    expect(body.issuer).toBe(ORIGIN);
    expect(body.jwks_uri).toBe(`${ORIGIN}/.well-known/jwks.json`);
  });

  it('puts its configured origin in the access token', async () => {
    const test = createTestApp();
    const res = await exchange(test, (await signIn(test)) ?? '', forged);
    const tokens = (await res.json()) as Tokens;

    const [, payload = ''] = tokens.access_token.split('.');
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());

    expect(claims.iss).toBe(ORIGIN);
  });
});

describe('lazy hunk: a failed first load is tried again', () => {
  it('a storage failure while loading the keys fails that request only', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const memory = MemoryStorage();
    let failures = 1;
    const storage: StorageAdapter = {
      ...memory,
      scan(prefix) {
        if (failures-- > 0) {
          throw new Error('DynamoDB request failed: fetch failed');
        }
        return memory.scan(prefix);
      },
    };
    const test = createTestApp({ storage });

    const failed = await browser(test.app).get(authorizeUrl(ORIGIN));
    const next = await browser(test.app).get(authorizeUrl(ORIGIN));

    expect(failed.status).not.toBe(200);
    expect(next.status).toBe(200);
    expect(await next.text()).toContain('Continue with Google');
  });
});

/** A stand-in Google on a local port: discovery and a JWKS we can change */
async function startGoogle() {
  let discoveryFailures = 0;
  let keys: ReturnType<typeof fakeGoogleKey>[] = [];
  const server: Server = createServer((req, res) => {
    const send = (status: number, body: unknown) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    if (req.url === '/.well-known/openid-configuration') {
      if (discoveryFailures-- > 0) {
        return send(503, { error: 'unavailable' });
      }
      return send(200, {
        authorization_endpoint: `${issuer}/authorize`,
        issuer,
        jwks_uri: `${issuer}/jwks`,
      });
    }
    if (req.url === '/jwks') {
      return send(200, { keys: keys.map((key) => key.jwk) });
    }
    return send(404, {});
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const issuer = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return {
    close: () => new Promise((resolve) => server.close(resolve)),
    failDiscovery: (times: number) => {
      discoveryFailures = times;
    },
    issuer,
    useKeys: (next: ReturnType<typeof fakeGoogleKey>[]) => {
      keys = next;
    },
  };
}

/** A Google sign-in up to the site's callback, signed with `key` */
async function googleSignIn(
  test: TestApp,
  key: ReturnType<typeof fakeGoogleKey>,
) {
  const b = browser(test.app);
  await b.get(authorizeUrl(ORIGIN));
  const toGoogle = await b.get('/google/authorize');
  const location = toGoogle.headers.get('location') ?? '';
  const nonce = URL.canParse(location)
    ? new URL(location).searchParams.get('nonce')
    : null;
  if (!nonce) {
    return { location, status: toGoogle.status };
  }
  const done = await b.post('/google/callback', {
    id_token: key.idToken({
      email: 'ana@example.com',
      email_verified: true,
      nonce,
    }),
  });
  return { location: done.headers.get('location') ?? '', status: done.status };
}

describe('Google provider hunks', () => {
  it('fetches the discovery document again after it failed once', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const google = await startGoogle();
    try {
      const key = fakeGoogleKey(google.issuer);
      google.useKeys([key]);
      google.failDiscovery(1);
      const test = createTestApp({ googleIssuer: google.issuer });

      const failed = await googleSignIn(test, key);
      const next = await googleSignIn(test, key);

      expect(failed.location).toContain('error=server_error');
      expect(next.location).toMatch(
        /^http:\/\/localhost\/api\/auth\/callback\?code=/,
      );
    } finally {
      await google.close();
    }
  });

  it('takes a signing key Google added after its JWKS was first read', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.useFakeTimers({ now: Date.now(), toFake: ['Date'] });
    const google = await startGoogle();
    try {
      const oldKey = fakeGoogleKey(google.issuer, 'old');
      const newKey = fakeGoogleKey(google.issuer, 'new');
      google.useKeys([oldKey]);
      const test = createTestApp({ googleIssuer: google.issuer });
      expect((await googleSignIn(test, oldKey)).location).toContain('?code=');

      // Google rotates: the new key is published and signs from now on
      google.useKeys([oldKey, newKey]);
      vi.setSystemTime(Date.now() + 60_000);

      expect((await googleSignIn(test, newKey)).location).toContain('?code=');
    } finally {
      await google.close();
    }
  });
});

describe('DynamoStorage.count hunk (the send and try caps)', () => {
  /** A stand-in DynamoDB endpoint: records each call, answers from `reply` */
  async function startDynamo(reply: () => readonly [number, unknown]) {
    const calls: { body: Record<string, unknown>; target: string }[] = [];
    const server: Server = createServer((req, res) => {
      let raw = '';
      req.on('data', (chunk) => {
        raw += chunk;
      });
      req.on('end', () => {
        calls.push({
          body: JSON.parse(raw),
          target: String(req.headers['x-amz-target']),
        });
        const [status, body] = reply();
        res.writeHead(status, { 'content-type': 'application/x-amz-json-1.0' });
        res.end(JSON.stringify(body));
      });
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    const endpoint = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    return {
      calls,
      close: () => new Promise((resolve) => server.close(resolve)),
      endpoint,
    };
  }

  it('adds under the cap in one conditional write that creates the item with its expiry', async () => {
    vi.stubEnv('AWS_ACCESS_KEY_ID', 'test');
    vi.stubEnv('AWS_SECRET_ACCESS_KEY', 'test');
    vi.stubEnv('AWS_REGION', 'eu-west-2');
    vi.useFakeTimers({ now: 1_700_000_000_000, toFake: ['Date'] });
    let full = false;
    const dynamo = await startDynamo(() =>
      full
        ? [
            400,
            {
              __type:
                'com.amazonaws.dynamodb.v20120810#ConditionalCheckFailedException',
            },
          ]
        : [200, { Attributes: { n: { N: '3' } } }],
    );
    try {
      const storage = DynamoStorage({
        endpoint: dynamo.endpoint,
        table: 'auth',
      });

      expect(
        await Storage.count(storage, ['oauth:otp-day', '19675'], 500, 86_400),
      ).toBe(3);
      full = true;
      expect(
        await Storage.count(storage, ['oauth:otp-day', '19675'], 500, 86_400),
      ).toBeUndefined();

      const [call] = dynamo.calls;
      expect(call?.target).toBe('DynamoDB_20120810.UpdateItem');
      expect(call?.body).toMatchObject({
        ConditionExpression: 'attribute_not_exists(#n) OR #n < :max',
        ExpressionAttributeNames: { '#n': 'n', '#ttl': 'expiry' },
        ExpressionAttributeValues: {
          ':expiry': { N: String(1_700_000_000 + 86_400) },
          ':max': { N: '500' },
          ':step': { N: '1' },
        },
        Key: { pk: { S: 'oauth:otp-day' }, sk: { S: '19675' } },
        ReturnValues: 'ALL_NEW',
        TableName: 'auth',
        UpdateExpression:
          'ADD #n :step SET #ttl = if_not_exists(#ttl, :expiry)',
      });
    } finally {
      await dynamo.close();
    }
  });
});
