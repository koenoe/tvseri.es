/**
 * A local stand-in for the auth service, so a local server can render signed
 * in against the stub API: the OpenAuth discovery document and keys the web's
 * `verify()` reads, and `GET /session?user=<id>` minting a session cookie value
 * for one of the stub's invented users (e2e/fixtures/home/viewer.ts).
 *
 *   SECRET_KEY=<any local value> node --conditions=react-server e2e/stub-api/issuer.ts   # port STUB_AUTH_PORT, else ISSUER_PORT (viewer.ts)
 *   then run the web with the same SECRET_KEY and AUTH_URL=http://localhost:<that port>
 *
 * `pnpm agents:serve web --stub` does both on the worktree's ports.
 *
 * Never point a browser that holds real sessions at that web server: it can't
 * read their cookies and drops them. Use a fresh browser context.
 */
import { createServer } from 'node:http';

import { exportJWK, generateKeyPair, SignJWT } from 'jose';

import { encryptToken } from '../../src/auth/crypto.ts';
import { ISSUER_PORT, VIEWERS } from '../fixtures/home/viewer.ts';

const port = Number(process.env.STUB_AUTH_PORT ?? ISSUER_PORT);
const issuer = `http://localhost:${port}`;
const KID = 'stub';
const { privateKey, publicKey } = await generateKeyPair('ES256');
const jwk = {
  ...(await exportJWK(publicKey)),
  alg: 'ES256',
  kid: KID,
  use: 'sig',
};

const DAY = 86_400;

async function sessionCookie(userId: string) {
  const viewer = VIEWERS.find((item) => item.user.id === userId);
  if (!viewer) {
    return null;
  }
  const accessToken = await new SignJWT({
    mode: 'access',
    properties: { id: viewer.user.id, role: viewer.user.role },
    type: 'user',
  })
    .setProtectedHeader({ alg: 'ES256', kid: KID })
    .setIssuer(issuer)
    .setSubject(`user:${viewer.user.id}`)
    .setAudience('website')
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(privateKey);
  return encryptToken({
    accessToken,
    expiresAt: Math.floor(Date.now() / 1000) + 30 * DAY,
    refreshToken: 'stub-refresh',
  });
}

createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', issuer);
  const json = (status: number, body: unknown) => {
    response.writeHead(status, { 'content-type': 'application/json' });
    response.end(JSON.stringify(body));
  };
  if (url.pathname === '/.well-known/oauth-authorization-server') {
    json(200, {
      authorization_endpoint: `${issuer}/authorize`,
      issuer,
      jwks_uri: `${issuer}/.well-known/jwks.json`,
      token_endpoint: `${issuer}/token`,
    });
    return;
  }
  if (url.pathname === '/.well-known/jwks.json') {
    json(200, { keys: [jwk] });
    return;
  }
  if (url.pathname === '/session') {
    const cookie = await sessionCookie(url.searchParams.get('user') ?? '');
    json(cookie ? 200 : 404, cookie ? { cookie } : { message: 'No such user' });
    return;
  }
  json(404, { message: 'Not found (stub issuer)' });
}).listen(port, '127.0.0.1', () => {
  console.log(`stub issuer on ${issuer}`);
});
