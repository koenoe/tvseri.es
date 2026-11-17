/**
 * A tiny OpenAuth-compatible issuer for LOCAL runs only (see README.md): it
 * signs access tokens for the stub API's viewers, answers the discovery and
 * JWKS routes the web's `verify` reads, refreshes tokens, and hands out the
 * encrypted session cookie value for a viewer. It also serves the local
 * images (`GET /img/:name` from `STUB_IMG_DIR`).
 *
 * Run it from `apps/web` with the `react-server` condition (the web's
 * `crypto.ts` imports `server-only`):
 *
 *   SECRET_KEY=local-stub-only STUB_AUTH_PORT=4216 STUB_IMG_DIR=<folder> \
 *     node --conditions=react-server e2e/stub-auth/server.ts
 *
 * `SECRET_KEY` is a made-up value that must match the web's. Never use a real
 * secret here.
 */
import { createReadStream, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';

import { exportJWK, generateKeyPair, SignJWT } from 'jose';

import { SESSION_COOKIE_NAME } from '../../src/auth/cookies.ts';
import { encryptToken } from '../../src/auth/crypto.ts';
import { VIEWERS } from '../stub-api/fixtures/show/store.ts';
import { createRotation } from './rotation.ts';

const port = Number(process.env.STUB_AUTH_PORT ?? 4216);
const issuer = process.env.STUB_AUTH_URL ?? `http://localhost:${port}`;
const imgDir = process.env.STUB_IMG_DIR ?? '';

// Ten years: a local session never needs a refresh unless a test forces one.
const ACCESS_SECONDS = 10 * 365 * 24 * 60 * 60;
const KEY_ID = 'stub-auth-1';

const { privateKey, publicKey } = await generateKeyPair('ES256');
const jwk = {
  ...(await exportJWK(publicKey)),
  alg: 'ES256',
  kid: KEY_ID,
  use: 'sig',
};

type ViewerName = keyof typeof VIEWERS;

const isViewerName = (name: string | null): name is ViewerName =>
  name !== null && name in VIEWERS;

/**
 * A test's isolated state namespace (see `stub-api/server.ts`): carried as an
 * `ns` claim in the access token and in the refresh token, so refreshes keep it.
 */
const isNamespace = (value: string | null): value is string =>
  value !== null && /^[\w-]{1,80}$/.test(value);

const signAccess = (
  name: ViewerName,
  ns?: string,
  /** Absolute expiry (epoch seconds); default: `ACCESS_SECONDS` from now. */
  expiresAt?: number,
): Promise<string> => {
  const { id, user } = VIEWERS[name];
  return new SignJWT({
    ...(ns && { ns }),
    mode: 'access',
    properties: { id, role: user.role },
    type: 'user',
  })
    .setProtectedHeader({ alg: 'ES256', kid: KEY_ID })
    .setIssuer(issuer)
    .setAudience('website')
    .setSubject(`user:${id}`)
    .setIssuedAt()
    .setExpirationTime(expiresAt ?? `${ACCESS_SECONDS}s`)
    .sign(privateKey);
};

/**
 * Sessions with rotating, reuse-windowed refresh tokens like the real issuer
 * (`rotation.ts`), for the refresh tests: `/__session?…&rotate=1`.
 */
const rotation = createRotation();

const nowSeconds = () => Math.floor(Date.now() / 1000);

const seconds = (value: string | null, fallback: number): number => {
  const parsed = value === null ? Number.NaN : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/** The refresh token only names the viewer: `stub-refresh.<name>[.<ns>]`. */
const refreshTokenFor = (name: ViewerName, ns?: string): string =>
  ns ? `stub-refresh.${name}.${ns}` : `stub-refresh.${name}`;

const fromRefresh = (
  token: string | null,
): { name: ViewerName; ns?: string } | null => {
  const [name, ns] = token?.startsWith('stub-refresh.')
    ? token.slice(13).split('.')
    : [];
  if (!name || !isViewerName(name)) {
    return null;
  }
  return ns ? { name, ns } : { name };
};

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

const json = (body: unknown, status = 200) => ({
  body: JSON.stringify(body),
  headers: { 'content-type': 'application/json' },
  status,
});

/**
 * A session cookie for a rotating family. `access` is the lifetime (seconds)
 * left on the first access token (0 or less: already expired, so the next
 * request refreshes); `after` the lifetime of refreshed ones; `reuse` the
 * issuer's reuse window (default 300, as in `apps/auth`).
 */
async function rotatingSession(
  name: ViewerName,
  ns: string,
  params: URLSearchParams,
): Promise<string> {
  const refreshToken = rotation.start({
    accessSeconds: seconds(params.get('after'), 600),
    name,
    ns,
    reuseSeconds: seconds(params.get('reuse'), 300),
  });
  const expiresAt = nowSeconds() + seconds(params.get('access'), 0);
  return encryptToken({
    accessToken: await signAccess(name, ns, expiresAt),
    expiresAt,
    refreshToken,
  });
}

async function rotatingRefresh(token: string) {
  const ns = rotation.namespaceOf(token) ?? '';
  const fault = rotation.stats(ns);
  if (fault.failWith) {
    fault.calls += 1;
    return json({ error: 'server_error' }, fault.failWith);
  }
  const outcome = rotation.refresh(token);
  if (fault.delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, fault.delayMs));
  }
  if (!outcome.ok) {
    return json(
      {
        error: 'invalid_grant',
        error_description: 'Refresh token has been used or expired',
      },
      400,
    );
  }
  const { family, issuedAt, refreshToken } = outcome;
  const expiresAt = Math.floor(issuedAt / 1000) + family.accessSeconds;
  return json({
    access_token: await signAccess(
      family.name as ViewerName,
      family.ns,
      expiresAt,
    ),
    expires_in: expiresAt - nowSeconds(),
    refresh_token: refreshToken,
  });
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', issuer);
  const send = (result: ReturnType<typeof json>) => {
    response.writeHead(result.status, {
      'access-control-allow-origin': '*',
      ...result.headers,
    });
    response.end(result.body);
  };

  if (request.method === 'GET' && url.pathname === '/health') {
    return send(json({ ok: true }));
  }

  if (url.pathname === '/.well-known/oauth-authorization-server') {
    return send(
      json({
        authorization_endpoint: `${issuer}/authorize`,
        issuer,
        jwks_uri: `${issuer}/.well-known/jwks.json`,
        token_endpoint: `${issuer}/token`,
      }),
    );
  }

  if (url.pathname === '/.well-known/jwks.json') {
    return send(json({ keys: [jwk] }));
  }

  if (request.method === 'POST' && url.pathname === '/token') {
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      chunks.push(chunk as Buffer);
    }
    const form = new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
    const token = form.get('refresh_token');
    if (form.get('grant_type') === 'refresh_token' && rotation.owns(token)) {
      return send(await rotatingRefresh(token ?? ''));
    }
    const refreshed = fromRefresh(token);
    if (form.get('grant_type') !== 'refresh_token' || !refreshed) {
      return send(json({ error: 'invalid_grant' }, 400));
    }
    return send(
      json({
        access_token: await signAccess(refreshed.name, refreshed.ns),
        expires_in: ACCESS_SECONDS,
        refresh_token: refreshTokenFor(refreshed.name, refreshed.ns),
      }),
    );
  }

  // The session cookie value (what the web stores in `__tvseries_session`).
  if (url.pathname === '/__session') {
    const name = url.searchParams.get('user');
    if (!isViewerName(name)) {
      return send(
        json(
          {
            message:
              'user must be one of the stub viewers (fixtures/show/store.ts)',
          },
          400,
        ),
      );
    }
    const nsParam = url.searchParams.get('ns');
    const ns = isNamespace(nsParam) ? nsParam : undefined;
    if (url.searchParams.get('rotate') === '1') {
      if (!ns) {
        return send(json({ message: 'rotate=1 needs an ns' }, 400));
      }
      return send(
        json({
          name: SESSION_COOKIE_NAME,
          userId: VIEWERS[name].id,
          value: await rotatingSession(name, ns, url.searchParams),
        }),
      );
    }
    const value = await encryptToken({
      accessToken: await signAccess(name, ns),
      expiresAt: Math.floor(Date.now() / 1000) + ACCESS_SECONDS,
      refreshToken: refreshTokenFor(name, ns),
    });
    if (url.searchParams.get('format') === 'json') {
      return send(
        json({ name: SESSION_COOKIE_NAME, userId: VIEWERS[name].id, value }),
      );
    }
    return send({
      body: value,
      headers: { 'content-type': 'text/plain' },
      status: 200,
    });
  }

  // A raw access token, for curl against the stub API.
  if (url.pathname === '/__token') {
    const name = url.searchParams.get('user');
    const nsParam = url.searchParams.get('ns');
    return isViewerName(name)
      ? send({
          body: await signAccess(
            name,
            isNamespace(nsParam) ? nsParam : undefined,
          ),
          headers: { 'content-type': 'text/plain' },
          status: 200,
        })
      : send(
          json(
            {
              message:
                'user must be one of the stub viewers (fixtures/show/store.ts)',
            },
            400,
          ),
        );
  }

  // Refresh-test controls for a rotating session family (`rotation.ts`).
  if (url.pathname.startsWith('/__rotation')) {
    const ns = url.searchParams.get('ns');
    if (!isNamespace(ns)) {
      return send(json({ message: 'ns required' }, 400));
    }
    const action = url.pathname.slice('/__rotation'.length);
    if (request.method === 'POST' && action === '/lapse') {
      rotation.lapse(ns);
    } else if (request.method === 'POST' && action === '/spend') {
      rotation.spend(ns);
    } else if (request.method === 'POST' && action === '/revoke') {
      rotation.revoke(ns);
    } else if (request.method === 'POST' && action === '/fault') {
      const failWith = url.searchParams.get('failWith');
      rotation.fault(ns, {
        delayMs: seconds(url.searchParams.get('delayMs'), 0),
        failWith: failWith ? Number(failWith) : undefined,
      });
    } else if (action !== '') {
      return send(json({ message: 'Not found (stub auth)' }, 404));
    }
    return send(json(rotation.stats(ns)));
  }

  // Local images (the folder is not committed).
  if (
    (request.method === 'GET' || request.method === 'HEAD') &&
    url.pathname.startsWith('/img/') &&
    imgDir
  ) {
    const name = path.basename(url.pathname);
    const file = path.join(imgDir, name);
    if (existsSync(file)) {
      response.writeHead(200, {
        'access-control-allow-origin': '*',
        'cache-control': 'public, max-age=3600',
        'content-type':
          CONTENT_TYPES[path.extname(name)] ?? 'application/octet-stream',
      });
      createReadStream(file).pipe(response);
      return;
    }
  }

  send(json({ message: 'Not found (stub auth)' }, 404));
});
// Longer than the web's keep-alive (undici: 4s, or the server's hint), so
// the client always closes an idle socket first. With Node's 5s default, a
// request sent on a socket the server was about to drop was reset
// (ECONNRESET), above all while this one thread was busy.
server.keepAliveTimeout = 60_000;
server.listen(port, '127.0.0.1', () => {
  console.log(`stub auth on ${issuer} (images: ${imgDir || 'none'})`);
});
